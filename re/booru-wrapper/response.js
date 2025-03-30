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

		const keys = options.keys ?? this.booru.config.keys
		const remove_other_keys = options.remove_other_keys ?? this.booru.remove_other_keys

		this.tags = options.tags ?? ''
		this.page = options.page ?? this.booru.config.page_offset
		this.limit = options.limit ?? this.booru.config.limit
		this.hasNext = pics.length === this.limit

		if( keys ){
			this.results = []

			pics.forEach( oldPic => {
				const newPic = {}

				if( typeof keys._before === 'function' )
					keys._before( oldPic, newPic, this.tags )

				for( const key in oldPic ){
					if( typeof keys[key] === 'string' )
						newPic[keys[key] || key] = oldPic[key]
					else if( typeof keys[key] === 'function' )
						keys[key]( oldPic, newPic, this.tags )
					else if( !remove_other_keys && key !== keys[key] )
						newPic[key] = oldPic[key]
				}

				if( typeof keys._after === 'function' )
					keys._after( oldPic, newPic, this.tags )

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
		if ( !this.hasNext )
			return null

		const response = await this.booru.posts( this.tags, ++this.page, limit ?? this.limit )
		this.results.push( ...response.results )
		this.hasNext = response.hasNext
		return response
	}
}