
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
			
			case 'undefined':
				target[prop] = defaultValue
				break

			default:
				target[prop] = options[prop]
				break
		}
	}
}

module.exports = axios_module => {
	const axios = axios_module
	
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
		remove_other_keys = false

		// where's array of pics located at
		set path_to_pics( path ){
			this._splitted_path_to_pics = path.split( /\/+/g ).filter( v => !!v )
		}
		
		get path_to_pics(){
			return this._splitted_path_to_pics.join( '/' )
		}

		_splitted_path_to_pics = []
		
		constructor( options ){
			const keys = [...Object.keys( this ), 'path_to_pics']
			resolveOptions( options, this, keys )
			
			if( this.url )
				this.url = this.url.replace( /\/*$/, '' )
			else
				throw Error( 'No URL specified' )
		}

		async q( tags, page, limit ){
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
			} = await axios.get( this.url, { params } )

			if( status !== 200 )
				throw Error( statusText )

			const pics = this._splitted_path_to_pics.reduce( ( data, prop ) => data?.[prop], data )

			return new BooruResponse( pics, {
				tags,
				page,
				limit,
				booru: this,
			})
		}
	}
	
	class BooruResponse {
		_resultKeyName = 'pics'

		get results(){
			return this[this._resultKeyName]
		}

		set results( value ){
			this[this._resultKeyName] = value
		}

		constructor( array, options, resultKeyName = 'pics' ){
			this._resultKeyName = resultKeyName || this._resultKeyName

			if( !( array instanceof Array ) )
				array = []
			
			if( !( this.booru = options.booru ) )
				throw Error( 'No booru specified in options' )

			const keys = options.keys ?? this.booru.keys
			const remove_other_keys = options.remove_other_keys ?? this.booru.remove_other_keys

			this.tags = options.tags ?? ''
			this.page = options.page ?? this.booru.page_offset
			this.limit = options.limit ?? this.booru.limit
			
			if( keys instanceof Object ){
				this.results = []
				
				array.forEach( oldValue => {
					const newValue = {}
					
					for( const key in oldValue ){
						if( typeof keys[key] === 'string' )
							newValue[keys[key] || key] = oldValue[key]
						else if( typeof keys[key] === 'function' )
							keys[key]( oldValue, newValue, this.tags )
						else if( !remove_other_keys && key !== keys[key] )
							newValue[key] = oldValue[key]
					}
					
					this.results.push( newValue )
				})
			} else
				this.results = array
		}
		
		async parseNextPage( limit ){
			const response = await this.booru.q( this.tags, ++this.page, limit ?? this.limit )
			this.results.push( ...response.results )
			return response
		}
	}
	Booru.BooruResponse = BooruResponse

	return Booru
}

return /// the end

////////////////////
////  Examples  ////
////////////////////

// Gelbooru:
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
				pic.unsupportedExtention = pic.full.matchFirst( /\.\w+$/i ).substring(1).toUpperCase()
		}
	},
	remove_other_keys: false,
})

// Yandere:
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