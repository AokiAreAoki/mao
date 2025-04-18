// eslint-disable-next-line no-global-assign
require = global.alias(require)
const fs = require( 'fs' )
const axios = require( 'axios' )
const axiosRetry = require( 'axios-retry' )
const get = require( 'lodash/get' )
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
	request = null

	constructor({
		path = null,
		url,
		tagParam = 'names',
		const_params = {},
		tagSplitter = ' ',
		responsePath = '',
		proxyAgent,
	}){
		this.path = path
		this.endpoint = url
		this.tagParam = tagParam
		this.const_params = const_params
		this.tagSplitter = tagSplitter
		this.responsePath = responsePath
		this.proxyAgent = typeof proxyAgent === 'function'
			? proxyAgent
			: () => proxyAgent

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

	get axios() {
		const axiosInstance = axios.create({
			httpAgent: this.proxyAgent(),
			httpsAgent: this.proxyAgent(),
		})

		axiosRetry( axiosInstance, {
			retries: 5,
			retryDelay: axiosRetry.exponentialDelay,
		})

		return axiosInstance
	}

	async resolveTags( tagSet, noFetch = false ){
		if( noFetch ){
			const tags = new Map()

			for( const undecodedTagname of tagSet ){
				const tagname = decodeHTMLEntities( undecodedTagname )
				const tag = await this.tags[tagname]

				if( tag?._cacheExpire && tag._cacheExpire > Date.now() )
					tags.set( tagname, tag )
			}

			return tags
		}

		this.accumulatedTags.merge( tagSet )
		this.resolveTimeout ??= new Promise( resolve => {
			setTimeout( async () => {
				resolve( this.fetchTags( this.accumulatedTags ) )
				this.accumulatedTags = new Set()
				this.resolveTimeout = null
			}, 100 )
		})

		return this.resolveTimeout.then( () => this.resolveTags( tagSet, true ) )
	}

	async fetchTags( tagSet ){
		const tags = new Map()
		const uncachedTags = []

		for( const undecodedTagname of tagSet ){
			const tagname = decodeHTMLEntities( undecodedTagname )
			const tag = await this.tags[tagname]

			if( !tag?._cacheExpire || tag._cacheExpire < Date.now() )
				uncachedTags.push( tagname )
			else
				tags.set( tagname, tag )
		}

		if( uncachedTags.length === 0 )
			return tags

		const newTagsPromise = this.axios
			.get( this.endpoint, {
				params: {
					...this.const_params,
					[this.tagParam]: uncachedTags.join( this.tagSplitter ),
				},
				onRetry(){
					console.log( 'Tag API failed. Retrying...' )
				},
			})
			.then( response => get( response.data.tag, this.responsePath, response.data.tag ) )
			.then( newTags => {
				if( newTags instanceof Array ){
					newTags.forEach( tag => {
						tag.name = decodeHTMLEntities( tag.name )
						tag.type = TagCacher.getTagType( tag.type )
						tag._cacheExpire = Date.now() + 3600e3 * 24 * 7
						tags.set( tag.name, this.tags[tag.name] = tag )
					})
				}

				this.saveCache()
				this.request = null
				return tags
			})

		uncachedTags.forEach( tagname => {
			this.tags[tagname] = newTagsPromise
				.then( map => map.get( tagname ) )
		})

		return newTagsPromise
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