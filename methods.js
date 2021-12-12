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

String.prototype.char = function(){
	return this.charCodeAt()
}

Number.prototype.char = function(){
	return String.fromCharCode( this )
}

String.prototype.line = function( start = 1, end ){
	if( !end )
		end = start
	else if( end < start )
		end = undefined

	return this.split( '\n' ).slice( start - 1, end ).join( '\n' )
}
