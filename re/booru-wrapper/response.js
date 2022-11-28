const Picture = require( './picture' )

module.exports = class BooruResponse {
	_resultKeyName = 'pics'

	get results(){
		return this[this._resultKeyName]
	}

	set results( value ){
		this[this._resultKeyName] = value
	}

	constructor( pics, options, resultKeyName = 'pics' ){
		this._resultKeyName = resultKeyName || this._resultKeyName

		if( !( pics instanceof Array ) )
			pics = []

		if( !( this.booru = options.booru ) )
			throw Error( 'No booru specified in options' )

		const keys = options.keys ?? this.booru.keys
		const remove_other_keys = options.remove_other_keys ?? this.booru.remove_other_keys

		this.tags = options.tags ?? ''
		this.page = options.page ?? this.booru.page_offset
		this.limit = options.limit ?? this.booru.limit

		if( keys ){
			this.results = []

			pics.forEach( oldPic => {
				const newPic = {}

				for( const key in oldPic ){
					if( typeof keys[key] === 'string' )
						newPic[keys[key] || key] = oldPic[key]
					else if( typeof keys[key] === 'function' )
						keys[key]( oldPic, newPic, this.tags )
					else if( !remove_other_keys && key !== keys[key] )
						newPic[key] = oldPic[key]
				}

				this.results.push( newPic )
			})
		} else
			this.results = pics

		this.results.forEach( pic => {
			Object.setPrototypeOf( pic, Picture.prototype )
			pic.booru = this.booru
		})
	}

	async parseNextPage( limit ){
		const response = await this.booru.posts( this.tags, ++this.page, limit ?? this.limit )
		this.results.push( ...response.results )
		return response
	}
}