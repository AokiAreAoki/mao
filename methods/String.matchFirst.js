module.exports = function(){
	String.prototype.matchFirst = function( re, cb ){
		let matched = this.match( re )
		let string = null

		if( matched ){
			string = matched[1] ?? matched[0]

			if( string && typeof cb === 'function' )
				cb( string )
		}

		return string
	}
}