function isDigit( char ){
  return '0' <= char && char <= '9'
}

module.exports = function numsplit( number ){
	number = String( number )
	let int = ''
	let i = 0

	for( ; i < number.length; ++i )
		if( !isDigit( number[i] ) )
			break

	for( let i2 = i; i2 > 0; i2 -= 3 )
		int = number.substring( i2 - 3, i2 ) + ( int ? ',' : '' ) + int

	if( number[i] === '.' ){
		++i

		for( let n = -1; i < number.length; ++i ){
			if( !isDigit( number[i] ) )
				break

			if( ++n % 3 === 0 )
				int += ( n === 0 ? '.' : ',' )

			int += number[i]
		}
	}

	return int + number.substring(i)
}
