
const INDENTATION_LENGTH = 4
const INDENTATION = ' '.repeat( INDENTATION_LENGTH )
const STRING_INDENTATION = ' '.repeat( INDENTATION_LENGTH - 1 ) + '|'

const __duplicates = new Map()
let __maxDepth = 4

function* iterateAny( object ) {
	for( const key in object )
		yield [ key, object[key] ]
}

function _printify( v, depth = 0, path = '.' ){
	if( v == null )
		return String(v)

	if( typeof v !== 'object' ){
		if( typeof v === 'string' )
			return v.indexOf( '\n' ) !== - 1
				? '|\n' + v
					.split( '\n' )
					.map( l => INDENTATION.repeat( depth ) + STRING_INDENTATION + l )
					.join( '\n' )
				: `"${v}"`

		if( typeof v === 'number' || typeof v === 'boolean' )
			return String(v)

		return `${v.constructor.name}(${String(v)})`
	}

	if( v instanceof RegExp )
		return v.toString()

	const dupLocation = __duplicates.get(v)

	if( dupLocation )
		return `Duplicate of ${v.constructor.name} at "${dupLocation}"`

	__duplicates.set( v, path )
	++depth

	const isArray = v instanceof Array
	const isIterable = typeof v[Symbol.iterator] === 'function'

	const iter = isArray || !isIterable
		? iterateAny(v)
		: v[Symbol.iterator]()

	const size = isIterable && !isArray
		? v.size ?? 'unknown amount of'
		: Object.keys(v).length

	let content

	if( size === 0 )
		content = '<empty>'
	else if( depth > __maxDepth ){
		let members = ( isArray || isIterable
			? 'item'
			: 'member'
		) + ( size === 1 ? '' : 's' )

		if( isArray && v.length !== size ){
			const items = v.length === 1 ? 'member' : 'members'
			members = `${items}; ${v.length} ${members}`
		}

		members = size + ' ' + members
		content = `<${members}>`
	} else {
		const lines = v instanceof Set
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

	return `${v.constructor.name} ${isArray || isIterable ? `[${content}]` : `{${content}}`}`
}

function printify( value, maxDepth = 4 ){
	__maxDepth = maxDepth
	const s = _printify( value )
	__duplicates.clear()
	return s
}

module.exports = printify
