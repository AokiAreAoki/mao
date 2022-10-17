module.exports = function(){
	String.prototype.line = function( start = 1, end ){
		if( !end )
			end = start
		else if( end < start )
			end = undefined

		return this.split( '\n' ).slice( start - 1, end ).join( '\n' )
	}
}