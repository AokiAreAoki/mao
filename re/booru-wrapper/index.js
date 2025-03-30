const axios = require( 'axios' )
const axiosRetry = require( 'axios-retry' )
const get = require( 'lodash/get' )
const Picture = require( './picture' )
const BooruResponse = require( './response' )

function resolveOptions( options, target ){
	for( const prop in target ){
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
	config = {
		name: 'unknown booru', // Just a name of a booru
		url: '', // API URL
		limit: 100, // limit of posts per request
		pageOffset: 1, // page offset
		params: [ // query params
			'tags',
			'page',
			'limit',
			// * if some params are not specified default param name will be used
		],
		constParams: {}, // constant query params
		keys: {}, // Response keys
		pathToPics: '',
	}

	// where's array of pics located at
	_splittedPathToPics = []

	set pathToPics( path ){
		this._splittedPathToPics = path.split( /\/+/g ).filter( v => !!v )
	}

	get pathToPics(){
		return this._splittedPathToPics.join( '/' )
	}

	constructor({
		config,
		tagFetcher,
		removeOtherKeys,
		retries,
		proxyAgent,
	}) {
		resolveOptions( config, this.config )

		if( this.config.url )
			this.config.url = this.config.url.replace( /\/*$/, '' )
		else
			throw Error( 'No URL specified' )

		this.pathToPics = this.config.pathToPics ?? ''
		this.tagFetcher = tagFetcher ?? (v => v)
		this.removeOtherKeys = removeOtherKeys ?? false
		this.retries = retries ?? 5
		this.proxyAgent = typeof proxyAgent === 'function'
			? proxyAgent
			: () => proxyAgent
	}

	get axios() {
		const axiosInstance = axios.create({
			httpAgent: this.proxyAgent(),
			httpsAgent: this.proxyAgent(),
		})

		axiosRetry( axiosInstance, {
			retries: this.retries,
			retryDelay: axiosRetry.exponentialDelay,
		})

		return axiosInstance
	}

	async posts( tags, page, limit ){
		const params = {}

		for( const k in this.config.constParams )
			params[k] = this.config.constParams[k]

		if( tags instanceof Array )
			tags = tags.join( ' ' )

		params[this.config.params.tags] = tags
		params[this.config.params.page] = page = ( page ?? 0 ) + this.config.pageOffset
		params[this.config.params.limit] = limit = limit ?? this.config.limit

		const {
			status,
			statusText,
			data,
		} = await this.axios.get( this.config.url, { params } )

		if( status !== 200 )
			throw Error( statusText )

		let pics = this._splittedPathToPics.length === 0
			? data
			: get( data, this._splittedPathToPics )

		pics = pics instanceof Array
			? pics
			: []

		await Promise.all( pics.map( async pic => (
			pic.tags = await this.tagFetcher( pic.tags
				.split( /\s+/ )
				.filter( t => !!t )
			)
		)))

		return new BooruResponse( pics, {
			tags,
			page,
			limit,
			booru: this,
		})
	}

	async postsAll( tags ){
		const response = await this.posts( tags, 0 )

		while( response.hasNext ){
			await response.parseNextPage()
		}

		return response
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
	config: {
		name: 'gelbooru.com',
		url: 'https://gelbooru.com/index.php',
		pageOffset: 0,
		params: {
			// tags keyword is "tags" by default
			page: 'pid',
			// limit keyword is "limit" by default
		},
		constParams: {
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
				pic.postURL = `https://gelbooru.com/index.php?page=post&s=view&id=${pic.id}&tags=${tags}`
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
	},
	removeOtherKeys: false,
})

// Yandere:
// eslint-disable-next-line no-unreachable, no-unused-vars
const Yandere = new Booru({
	config: {
		name: 'yande.re',
		url: 'https://yande.re/post.json',
		// pageOffset is 1 by default
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
				pic.postURL = 'https://yande.re/post/show/' + pic.id
			},
			score: '',
			file_url: 'full',
			sample_url: 'sample',
			created_at: ( post, pic ) => pic.created_at = post.created_at * 1000
		},
	},
	removeOtherKeys: false,
})