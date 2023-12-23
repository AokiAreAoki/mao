
const INDENTATION_LENGTH = 4
const INDENTATION = ' '.repeat( INDENTATION_LENGTH )
const __duplicates = new Map()
let __maxDepth = 4

function* iterateAny( object ) {
	for( const key in object )
		yield [ key, object[key] ]
}

function _printify( value, depth = 0, path = '.' ){
	if( value == null )
		return String(value)

	if( typeof value !== 'object' ){
		if( typeof value === 'string' )
			return value.indexOf( '\n' ) !== -1
				? '|' + ( '\n' + value ).replace( /\n/g, '\n' + INDENTATION.repeat( depth + 1 ) )
				: `"${value}"`

		if( typeof value === 'function' )
			return `<function>`

		if( typeof value === 'number' || typeof value === 'boolean' )
			return String(value)

		return `${value.constructor.name}(${String(value)})`
	}

	if( value instanceof RegExp )
		return value.toString()

	const dupLocation = __duplicates.get(value)

	if( dupLocation )
		return `Duplicate of ${value.constructor?.name} at "${dupLocation}"`

	__duplicates.set( value, path )
	++depth

	const isArray = value instanceof Array
	const isIterable = typeof value[Symbol.iterator] === 'function'

	const iter = isArray || !isIterable
		? iterateAny(value)
		: value[Symbol.iterator]()

	const size = isIterable && !isArray
		? value.size ?? 'unknown amount of'
		: Object.keys(value).length

	let content

	if( size === 0 )
		content = '<empty>'
	else if( depth > __maxDepth ){
		let members = ( isArray || isIterable
			? 'item'
			: 'member'
		) + ( size === 1 ? '' : 's' )

		if( isArray && value.length !== size ){
			const items = value.length === 1 ? 'member' : 'members'
			members = `${items}; ${value.length} ${members}`
		}

		members = size + ' ' + members
		content = `<${members}>`
	} else {
		const lines = value instanceof Set
			? Array.from( iter, v => {
				v = _printify( v, depth, path + '/<Set>' )
				return `${INDENTATION.repeat( depth )}${v}`
			})
			: Array.from( iter, ([ k, v ]) => {
				v = _printify( v, depth, path + '/' + k )
				return `${INDENTATION.repeat( depth )}${k}: ${v}`
			})

		content = `\n${lines.join( '\n' )}\n${INDENTATION.repeat( --depth )}`
	}

	return `${value.constructor?.name} ${isArray || isIterable ? `[${content}]` : `{${content}}`}`
}

function printify( value, maxDepth = 4 ){
	__maxDepth = maxDepth
	const s = _printify( value )
	__duplicates.clear()
	return s
}

module.exports = printify
