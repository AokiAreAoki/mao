
const indentation = process.platform === 'win32'
	? ' '.repeat(4)
	: '\t'

const __duplicates = new Map()
let __maxDepth = 4

function* iterateUniterable( object ) {
	for( const key in object )
		yield [ key, object[key] ]
}

function _printify( v, depth = 0, path = '.' ){
	if( v == null )
		return String(v)

	if( typeof v !== 'object' ) {
		if( typeof v === 'string' )
			return `"${v}"`

		if( typeof v === 'number' || typeof v === 'boolean' )
			return String(v)

		return `${v.constructor.name}(${String(v)})`
	}

	const dupLocation = __duplicates.get(v)

	if( dupLocation )
		return `Duplicate of ${v.constructor.name} at "${dupLocation}"`

	__duplicates.set( v, path )
	++depth

	if( v instanceof Set ) {
		const iter = v.values()
		let values = _printify( iter.next().value, Infinity, path )

		for( const value of iter )
			values += ', ' + _printify( value, Infinity, path )

		return `Set [${values}]`
	}

	const isArray = v instanceof Array
	const isIterable = typeof v[Symbol.iterator] === 'function'

	const iter = isArray || !isIterable
		? iterateUniterable(v)
		: v[Symbol.iterator]()

	const size = isIterable && !isArray
		? v.size
		: Object.keys(v).length

	const content = size === 0
		? '<empty>'
		: depth > __maxDepth
			? `<${size ?? 'unknown amount of'} item${size === 1 ? '' : 's'}${isArray && v.length !== size ? `; ${v.length} length` : ''}>`
			: '\n' + Array.from( iter, ([ k, v ]) => {
				v = _printify( v, depth, path + '/' + k )
				return `${INDENTATION.repeat( depth )}${k}: ${v}`
			}).join( '\n' ) + '\n' + INDENTATION.repeat( --depth )

	return `${v.constructor.name} ${isArray || isIterable ? `[${content}]` : `{${content}}`}`
}

function printify( value, maxDepth = 4 ){
	__maxDepth = maxDepth
	const s = _printify( value )
	__duplicates.clear()
	return s
}

module.exports = printify