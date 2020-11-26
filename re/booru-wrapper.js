module.exports = request_module => {
	const log = console.log
	const req = request_module
	
	class Booru {
		constructor( options ){
			let all_options = {
				name: 'unknown booru', // Just a name of booru
				url: '', // API request URL
				limit: 100, // Posts limit per request
				page_offset: 1, // page offset
				qs: [ // API keywords
					'tags', // here goes your tags
					'page', // page keyword
					'limit', // how many pics/posts should be requested
					// *if some keys not specified default keys will be used
				],
				const_qs: {}, // Table of constant keys
				keys: {}, // Response keys
				remove_other_keys: false,
			}
			
			for( let k in all_options ){
				let dv = all_options[k] // default value
				
				if( dv instanceof Array && options[k] instanceof Object ){
					let array = {}
					
					dv.forEach( dk => {
						if( typeof options[k][dk] === 'undefined' )
							return array[dk] = dk
							
						if( typeof options[k][dk] === 'string' ){
							array[dk] = options[k][dk].trim()
							if( !array[dk] ) array[dk] = dk
							return
						}

						array[dk] = options[k][dk]
					})
					
					this[k] = array
					continue
				}

				switch( typeof options[k] ){
					case 'string':
						this[k] = dv.trim()
						if( this[k] )
							break;
					
					case 'undefined':
						this[k] = dv

					default:
						this[k] = options[k]
				}
			}
			
			if( this.url )
				this.url = this.url.replace( /\/*$/, '' )
			else
				throw new Error( 'No URL specified' )
		}
		
		q( tags, page, limit ){
			return new Promise( async ( succes, error ) => {
				let qs = {}
				
				for( let k in this.const_qs )
					qs[k] = this.const_qs[k]
				
				qs[this.qs.tags] = tags
				qs[this.qs.page] = ( page || 0 ) + this.page_offset
				qs[this.qs.limit] = limit || this.limit
				
				req({
					uri: this.url,
					qs: qs,
				}, ( err, res, body ) => {
					if( err )
						return error( err )

					try {
						console.log( "url: " + this.url )
						console.log( "queries: " , qs )
						console.log( "body: " + body )
						body = JSON.parse( body )
					} catch( err ){
						console.log( 'error' )
						console.error( err )
					    body = []
					}
					
					succes( new BooruResults( body, {
						keys: this.keys,
						remove_other_keys: this.remove_other_keys,
						tags: tags,
						page: page,
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
		    
			let keys = options.keys
			let remove_other_keys = options.remove_other_keys
			
			this.tags = typeof options.tags !== 'undefined' ? options.tags : ''
			this.page = typeof options.page !== 'undefined' ? options.page : 1
			this.booru = options.booru
			
			if( keys && keys instanceof Object ){
				this.pics = []
				
				array_pics.forEach( ( old_pic, k ) => {
					let new_pic = {}
					
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
		
		async parseNextPage( limit=this.booru.limit ){
			if( this.booru ){
				let res = await this.booru.q( this.tags, ++this.page, limit || this.booru.limit )
				res.pics.forEach( this.pics.push )
				return true
			}
			
			return false
		}
	}

	return {
		Booru: Booru,
		BooruResults: BooruResults,
		Gelbooru: new Booru({
			url: 'https://gelbooru.com/index.php',
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
			limit: 100,
			keys: {
				id: '',
				score: '',
				// sample_url: 'sample',
				// file_url: 'full',
				file_url: ( old_pic, new_pic ) => {
					new_pic.full = old_pic.file_url
					new_pic.sample = new_pic.full.replace( /\/images\/((\w+\/)+)(\w+\.\w+)/, '/samples/$1sample_$3' )
				}
			},
			remove_other_keys: true,
		}),
		Yandere: new Booru({
			url: 'https://yande.re/post.json',
			qs: {
				// tags keyword is "tags" by default
				// page keyword is "page" by default
				// limit keyword is "limit" by default
			},
			limit: 100,
			keys: {
				id: '',
				score: '',
				file_url: 'full',
				sample_url: 'sample',
			},
			remove_other_keys: true,
		}),
	}
}
