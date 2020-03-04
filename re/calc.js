
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

function operate( tokens, opid ){
	tokens[opid] = calcsimple( tokens[opid], tokens[opid - 1], tokens[opid + 1] )
	delete tokens[opid - 1]
	delete tokens[opid + 1]
}

function calcsimple( operator, leftarg, rightarg ){
	switch( operator ){
		case '+':
			return leftarg + rightarg
			break;

		case '-':
			return leftarg - rightarg
			break;

		case '*':
			return leftarg * rightarg
			break;

		case '/':
			return leftarg / rightarg
			break;

		case '%':
			return leftarg % rightarg
			break;

		case '**':
			return leftarg ** rightarg
			break;

		default:
			throw new Error( 'CalcSimple: Unknown operator: ' + operator )
			break;
	}
}

function parse( tokens ){
	for( let i = 0; i < tokens.length; i++ ){
		let s = tokens[i]
		
		if( typeof s == 'number' ){
			
		} else if( typeof s == 'string' ){
			if( s == '(' ){
				let newtokens = [s]
				let breaks = 1
				
				while( breaks > 0 && ++i < tokens.length ){
					let b = tokens[i]
					newtokens.push(b)
					if( b == '(' ) breaks++;
					else if( b == ')' ) breaks--;
				}
				
				tokens[i] = parse( newtokens )
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
	
	return result[0]
}

function tokenize( expression ){
	return expression.match( tre )
}

function calc( expression ){
	let tokens = tokenize( expression )
	return parse( tokens )
}

module.exports = calc;