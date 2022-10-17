const htmlEntities = {
	nbsp: ' ',
	quot: '"',
	amp: '&',
	lt: '<',
	gt: '>',
}

module.exports = function decodeHTMLEntities( string ){
	return string
		.replace( /&#(\d+);/g, ( m, d ) => String.fromCharCode(d) )
		.replace( /&(nbsp|amp|quot|lt|gt);/g, ( m, e ) => htmlEntities[e] )
}