
var tre = /\d+(\.\d+)?(e\d+)?|\+|-|\*{1,2}|\/|%|\(|\)/g
var copy = Object.assign
var priors = [
	[ '**' ],
	[ '*', '/', '%' ],
	[ '+', '-' ],
]

function hasValue( array, value ){
	for( let k in array )
		if( array[k] === value )
			return true;
	return false
}

function compressArray( array ){
	let max = 0
	let lastExists = 0

	for( let k in array )
		if( max < k ) max = k;

	for( let i = 0; i < max; i++ ){
		if( !array[i] ){
			let i2 = Math.max( i, lastExists ) + 1
			while( !array[i2] && i2 < max ) i2++;

			array[i] = typeof array[i2] == 'object' ? copy( array[i2] ) : array[i2]
			delete array[i2]
			lastExists = i2
		}
	}

	return array
}

function operate( tokens, opId ){
	tokens[opId] = calcSimple( tokens[opId], tokens[opId - 1], tokens[opId + 1] )
	delete tokens[opId - 1]
	delete tokens[opId + 1]
}

function calcSimple( operator, loperand, roperand ){
	switch( operator ){
		case '+':
			return loperand + roperand

		case '-':
			return loperand - roperand

		case '*':
			return loperand * roperand

		case '/':
			return loperand / roperand

		case '%':
			return loperand % roperand

		case '**':
			return loperand ** roperand

		default:
			throw new Error( 'CalcSimple: Unknown operator: ' + operator )
	}
}

function parse( tokens ){
	for( let i = 0; i < tokens.length; i++ ){
		let s = tokens[i]

		if( typeof s == 'number' ){
			// eslint-disable-next-line no-empty
		} else if( typeof s == 'string' ){
			if( s == '(' ){
				let newTokens = [s]
				let breaks = 1

				while( breaks > 0 && ++i < tokens.length ){
					let b = tokens[i]
					newTokens.push(b)
					if( b == '(' ) breaks++;
					else if( b == ')' ) breaks--;
				}

				tokens[i] = parse( newTokens )
			} else if( s == ')' ){
				throw new Error( 'Unclosed break statement' )
			}
		}
	}

	let pri = 0
	let timeout = Date.now() + 2e3

	while( tokens.length > 1 ){
		if( Date.now() > timeout )
			throw new Error( 'Timeout' );

		for( let i = 0; i < tokens.length; i++ ){
			let token = tokens[i]

			if( typeof token == 'string' && hasValue( priors[pri], token ) )
				operate( tokens, i );

			compressArray( tokens )
		}
	}

	return tokens[0]
}

function tokenize( expression ){
	return expression.match( tre )
}

function calc( expression ){
	let tokens = tokenize( expression )
	return parse( tokens )
}

module.exports = calc;