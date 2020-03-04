function log( tabulation, text ){
	console.log( ' '.repeat( tabulation * 4 ), text )
}

function tree( text, callback, tabs=0 ){
	log( tabs++, text )

	function print( text ){
		log( tabs, text )
	}

	function fork( text, callback ){
		tree( text, callback, tabs )
	}

	callback( print, fork )
}

module.exports = ( text, callback ) => tree( text, callback )