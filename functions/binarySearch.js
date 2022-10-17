module.exports = function binarySearch( array, value, getComparable ){
	if( array.length === 0 )
		return 0

	let min = 0
	let max = array.length - 1
	let tooLong = 64

	while( min < max ){
		let middleIndex = min + ( ( max - min ) >> 1 )
		let middleValue = array[middleIndex]

		if( value < getComparable( middleValue ) )
			max = middleIndex - 1
		else
			min = middleIndex + 1

		if( --tooLong < 0 )
			throw Error( 'binary search took too much time' )
	}

	return min
}