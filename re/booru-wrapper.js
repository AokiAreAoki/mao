module.exports = request_module => {
	const req = request_module

	const all_options = {
		name: 'unknown booru', // Just a name of a booru
		url: '', // API URL
		limit: 100, // limit of posts per request
		page_offset: 1, // page offset
		qs: [ // query params
			'tags',
			'page',
			'limit',
			// * if some params are not specified default param name will be used
		],
		const_qs: {}, // constant query params
		keys: {}, // Response keys
		remove_other_keys: false,
	}
	
	class Booru {
		constructor( options ){
			for( let key in all_options ){
				let defaultValue = all_options[key]

				if( defaultValue instanceof Array && options[key] instanceof Object ){
					this[key] = {}
					
					defaultValue.forEach( defaultKey => {
						if( typeof options[key][defaultKey] === 'undefined' )
							return this[key][defaultKey] = defaultKey
							
						if( typeof options[key][defaultKey] === 'string' ){
							this[key][defaultKey] = options[key][defaultKey].trim()
							if( !this[key][defaultKey] ) this[key][defaultKey] = defaultKey
							return
						}

						this[key][defaultKey] = options[key][defaultKey]
					})
					
					continue
				}

				switch( typeof options[key] ){
					case 'string':
						if( this[key] = options[key].trim() )
							break
					
					case 'undefined':
						this[key] = defaultValue
						break

					default:
						this[key] = options[key]
						break
				}
			}
			
			if( this.url )
				this.url = this.url.replace( /\/*$/, '' )
			else
				throw Error( 'No URL specified' )
		}
		
		q( tags, page, limit ){
			return new Promise( async ( resolve, reject ) => {
				let qs = {}
				
				for( let k in this.const_qs )
					qs[k] = this.const_qs[k]
				
				if( tags instanceof Array )
					tags = tags.join( ' ' )
					
				qs[this.qs.tags] = tags
				qs[this.qs.page] = ( page ?? 0 ) + this.page_offset
				qs[this.qs.limit] = limit = limit ?? this.limit
				
				req({
					uri: this.url,
					qs: qs,
				}, ( err, res, body ) => {
					if( err )
						return reject( err )

					try {
						body = JSON.parse( body )
					} catch( err ){
						console.error( err )
						body = []
					}
					
					resolve( new BooruResults( body, {
						tags,
						page,
						limit,
						booru: this,
					}))
				})
			})
		}
	}
	
	class BooruResults {
		constructor( array_pics, options ){
			if( !( array_pics instanceof Array ) )
				array_pics = []
			
			if( !( this.booru = options.booru ) )
				throw Error( 'No booru specified in options' )

			const keys = options.keys ?? this.booru.keys
			const remove_other_keys = options.remove_other_keys ?? this.booru.remove_other_keys

			this.tags = options.tags ?? ''
			this.page = options.page ?? this.booru.page_offset
			this.limit = options.limit ?? this.booru.limit
			
			if( keys instanceof Object ){
				this.pics = []
				
				array_pics.forEach( ( old_pic, k ) => {
					const new_pic = {}
					
					for( let k in old_pic ){
						if( typeof keys[k] === 'string' )
							new_pic[keys[k] || k] = old_pic[k]
						else if( typeof keys[k] === 'function' )
							keys[k]( old_pic, new_pic, this.tags )
						else if( !remove_other_keys && k !== keys[k] )
							new_pic[k] = old_pic[k]
					}
					
					this.pics.push( new_pic )
				})
			} else
				this.pics = array_pics
		}
		
		async parseNextPage( limit ){
			const res = await this.booru.q( this.tags, ++this.page, limit ?? this.limit )
			this.pics.push( ...res.pics )
			return res
		}
	}

	Booru.BooruResults = BooruResults
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
	qs: {
		// tags keyword is "tags" by default
		page: 'pid',
		// limit keyword is "limit" by default
	},
	const_qs: {
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
	qs: {
		// tags keyword is "tags" by default
		// page keyword is "page" by default
		// limit keyword is "limit" by default
	},
	// no const qs
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