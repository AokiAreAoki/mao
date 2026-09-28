const MAX_ITERATIONS = 64
const rawComparison = v => v

/**
 * @typedef { ( targetValue: number, middleValue: number ) => boolean } Comparator
 *
 * @type { Record<'left' | 'right', Comparator> }
 */
const comparators = {
	left: ( targetValue, middleValue ) => targetValue < middleValue,
	right: ( targetValue, middleValue ) => targetValue <= middleValue,
}

/**
 *
 * @param {unknown[]} array
 * @param {number} targetValue
 * @param {unknown => number} getComparable
 * @param {keyof typeof comparators} side
 * @returns {number} index
 */
module.exports = function binarySearch(
	array,
	targetValue,
	getComparable = rawComparison,
	side = 'left',
){
	if( array.length === 0 )
		return 0

	let min = 0
	let max = array.length
	let iterationsLeft = MAX_ITERATIONS
	const comparator = comparators[side]

	while( min < max ){
		if( --iterationsLeft < 0 )
			throw Error( 'binary search took too long' )

		let middleIndex = min + ( ( max - min ) >>> 1 )
		let middleValue = array[middleIndex]

		if( comparator( targetValue, getComparable( middleValue ) ) )
			max = middleIndex
		else
			min = middleIndex + 1
	}

	return min
}
