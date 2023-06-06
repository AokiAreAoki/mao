const axios = require( 'axios' )
const axiosRetry = require( 'axios-retry' )
const _ = require( 'lodash' )
const Picture = require( './picture' )
const BooruResponse = require( './response' )

function resolveOptions( options, target, keys ){
	for( const prop of keys ){
		if( prop[0] === '_' )
			continue

		const defaultValue = target[prop]

		if( defaultValue instanceof Array && options[prop] instanceof Object ){
			target[prop] = {}

			for( const subprop of defaultValue ){
				if( typeof options[prop][subprop] === 'undefined' ){
					target[prop][subprop] = subprop
					continue
				}

				if( typeof options[prop][subprop] === 'string' ){
					target[prop][subprop] = options[prop][subprop].trim()
					if( !target[prop][subprop] ) target[prop][subprop] = subprop
					continue
				}

				target[prop][subprop] = options[prop][subprop]
			}

			continue
		}

		switch( typeof options[prop] ){
			case 'string':
				if( target[prop] = options[prop].trim() )
					break

			// eslint-disable-next-line no-fallthrough
			case 'undefined':
				target[prop] = defaultValue
				break

			default:
				target[prop] = options[prop]
				break
		}
	}
}

class Booru {
	name = 'unknown booru' // Just a name of a booru
	url = '' // API URL
	limit = 100 // limit of posts per request
	page_offset = 1 // page offset
	params = [ // query params
		'tags',
		'page',
		'limit',
		// * if some params are not specified default param name will be used
	]
	const_params = {} // constant query params
	keys = {} // Response keys
	tag_fetcher = async v => v // fetches tag data
	remove_other_keys = false
	retries = 5
	proxyAgent

	// where's array of pics located at
	set path_to_pics( path ){
		this._splitted_path_to_pics = path.split( /\/+/g ).filter( v => !!v )
	}

	get path_to_pics(){
		return this._splitted_path_to_pics.join( '/' )
	}

	_splitted_path_to_pics = []

	constructor( options ){
		const keys = Object.keys( this )
		keys.push( 'path_to_pics' )

		resolveOptions( options, this, keys )

		if( this.url )
			this.url = this.url.replace( /\/*$/, '' )
		else
			throw Error( 'No URL specified' )

		this.axios = axios.create({
			httpAgent: this.proxyAgent,
			httpsAgent: this.proxyAgent,
		})

		axiosRetry( this.axios, {
			retries: this.retries,
			retryDelay: axiosRetry.exponentialDelay,
		})
	}

	async posts( tags, page, limit ){
		const params = {}

		for( const k in this.const_params )
			params[k] = this.const_params[k]

		if( tags instanceof Array )
			tags = tags.join( ' ' )

		params[this.params.tags] = tags
		params[this.params.page] = ( page ?? 0 ) + this.page_offset
		params[this.params.limit] = limit = limit ?? this.limit

		const {
			status,
			statusText,
			data,
		} = await this.axios.get( this.url, { params } )

		if( status !== 200 )
			throw Error( statusText )

		let pics = this._splitted_path_to_pics.length === 0
			? data
			: _.get( data, this._splitted_path_to_pics )

		pics = pics instanceof Array
			? pics
			: []

		await Promise.all( pics.map( async pic => (
			pic.tags = await this.tag_fetcher( pic.tags )
		)))

		return new BooruResponse( pics, {
			tags,
			page,
			limit,
			booru: this,
		})
	}
}

Booru.BooruResponse = BooruResponse
Booru.Picture = Picture
module.exports = Booru
return // end

////////////////////
////  Examples  ////
////////////////////

// Gelbooru:
// eslint-disable-next-line no-unreachable, no-unused-vars
const Gelbooru = new Booru({
	name: 'gelbooru.com',
	url: 'https://gelbooru.com/index.php',
	page_offset: 0,
	params: {
		// tags keyword is "tags" by default
		page: 'pid',
		// limit keyword is "limit" by default
	},
	const_params: {
		page: 'dapi',
		s: 'post',
		q: 'index',
		json: '1',
	},
	limit: 250,
	keys: {
		id: ( post, pic, tags ) => {
			tags = tags.replace( /\s+/g, '+' )
			pic.id = post.id
			pic.post_url = `https://gelbooru.com/index.php?page=post&s=view&id=${pic.id}&tags=${tags}`
		},
		score: '',
		// sample_url: 'sample',
		// file_url: 'full',
		file_url: ( post, pic ) => {
			pic.full = post.file_url

			if( /\.(jpe?g|png|gif|bmp)$/i.test( pic.full ) ){
				pic.hasSample = post.sample == 1
				pic.sample = pic.hasSample && !pic.full.endsWith( '.gif' )
					? pic.full.replace( /\/images\/((\w+\/)+)(\w+\.)\w+/, '/samples/$1sample_$3jpg' )
					: pic.full
			} else
				pic.unsupportedExtension = pic.full.matchFirst( /\.\w+$/i ).substring(1).toUpperCase()
		}
	},
	remove_other_keys: false,
})

// Yandere:
// eslint-disable-next-line no-unreachable, no-unused-vars
const Yandere = new Booru({
	name: 'yande.re',
	url: 'https://yande.re/post.json',
	// page_offset is 1 by default
	params: {
		// tags keyword is "tags" by default
		// page keyword is "page" by default
		// limit keyword is "limit" by default
	},
	// no const params
	limit: 100,
	keys: {
		id: ( post, pic ) => {
			pic.id = post.id
			pic.post_url = 'https://yande.re/post/show/' + pic.id
		},
		score: '',
		file_url: 'full',
		sample_url: 'sample',
		created_at: ( post, pic ) => pic.created_at = post.created_at * 1000
	},
	remove_other_keys: false,
})