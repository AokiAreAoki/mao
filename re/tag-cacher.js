// eslint-disable-next-line no-global-assign
require = global.alias
const fs = require( 'fs' )
const axios = require( 'axios' )
const _ = require( 'lodash' )
const decodeHTMLEntities = require( '@/functions/decodeHTMLEntities' )

Set.prototype.merge = function( set ){
	set.forEach( v => this.add(v) )
}

class TagCacher {
	static tagTypes = [
		'general',
		'artist',
		'deprecated',
		'copyright',
		'character',
		'metadata',
	]

	static getTagType( typeCode ){
		return TagCacher.tagTypes[typeCode] ?? TagCacher.tagTypes[0]
	}

	tags = {}
	accumulatedTags = new Set()
	resolveTimeout = null

	constructor({
		path = null,
		url,
		tagParam = 'names',
		const_params = {},
		isUnbulkable = false,
		tagSplitter = ' ',
		responsePath = '',
	}){
		this.path = path
		this.endpoint = url
		this.tagParam = tagParam
		this.const_params = const_params
		this.isUnbulkable = isUnbulkable
		this.tagSplitter = tagSplitter
		this.responsePath = responsePath

		if( this.path == null )
			return

		if( !fs.existsSync( this.path ) ){
			this.tags = {}
			return
		}

		const cache = fs.readFileSync( this.path ).toString().trim()

		if( cache.length === 0 )
			this.tags = {}

		try {
			this.tags = JSON.parse( cache ) ?? {}
		} catch(e){
			console.error( 'Failed to parse JSON' )
		}
	}

	async resolveTags( tagSet ){
		if( this.isUnbulkable )
			return this._resolveTags( tagSet )

		this.accumulatedTags.merge( tagSet )
		const promise = this.resolveTimeout ??= new Promise( resolve => {
			setTimeout( async () => {
				resolve( this._resolveTags( this.accumulatedTags ) )
				this.accumulatedTags = new Set()
				this.resolveTimeout = null
			}, 10 )
		})

		return promise.then( () => this._resolveTags( tagSet ) )
	}

	async _resolveTags( tagSet ){
		const tags = new Map()
		const uncachedTags = []

		for( const undecodedTagname of tagSet ){
			const tagname = decodeHTMLEntities( undecodedTagname )
			const tag = this.tags[tagname]

			if( !tag?._cacheExpire || tag._cacheExpire < Date.now() )
				uncachedTags.push( tagname )
			else
				tags.set( tagname, tag )
		}

		if( uncachedTags.length === 0 )
			return tags

		const newTags = this.isUnbulkable
			? await Promise.all( uncachedTags.map( tag => {
				return axios.get( this.endpoint, {
					params: {
						...this.const_params,
						[this.tagParam]: tag,
					}
				})
					.then( response => _.get( response.data.tag, this.responsePath, response.data.tag ) )
			}))
			: await axios.get( this.endpoint, {
				params: {
					...this.const_params,
					[this.tagParam]: uncachedTags.join( this.tagSplitter ),
				}
			})
				.then( response => _.get( response.data.tag, this.responsePath, response.data.tag ) )

		if( newTags instanceof Array ){
			newTags.forEach( tag => {
				tag.name = decodeHTMLEntities( tag.name )
				tag.type = TagCacher.getTagType( tag.type )
				tag._cacheExpire = Date.now() + 3600e3 * 24 * 7
				tags.set( tag.name, this.tags[tag.name] = tag )
			})

			this.saveCache()
		}

		return tags
	}

	collectGarbage(){
		for( const k in this.tags ){
			const tag = this.tags[k]

			if( tag._cacheExpire < Date.now() )
				delete this.tags[k]
		}

		this.saveCache()
	}

	saveCache(){
		if( this.path == null )
			return

		setTimeout( () => {
			fs.writeFileSync( this.path, JSON.stringify( this.tags ) )
		}, 1 )
	}
}

module.exports = TagCacher