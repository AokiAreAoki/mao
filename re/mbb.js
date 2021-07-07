
function matchBalancedBrackets( text, bracketsType = '()' ){
	let brackets = 0
	let arraystrings = ['']
	let id = 0

	for( let i = 0; i < text.length; i++ ){
		let char = text[i]

		if( char == bracketsType[0] && ++brackets == 1 ){
			arraystrings[++id] = '';
			continue
		} else if( char == bracketsType[1] && --brackets == 0 ){
			if( brackets < 0 )
				throw new Error( 'Bro, WTF? There is a ")", but no "(".' );
			
			arraystrings[id] = matchBalancedBrackets( arraystrings[id] )
			arraystrings[++id] = ''
			continue
		}

		arraystrings[id] += char
	}

	return arraystrings
}

module.exports = matchBalancedBrackets

/*
var m = test( "this won't be matched(this will(and this also will)and this too :/)but this won't" )
console.log( m )
*/
