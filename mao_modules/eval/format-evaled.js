// eslint-disable-next-line no-global-assign
require = global.alias(require)

const numsplit = require( '@/functions/numsplit' )
const printify = require( '@/re/printify' )

const isNumberPrimitive = number => /^[+-]?([\w_]+|(\d+)?(\.\d+)?(e\d+)?)$/i.test( number )
const isCodePrimitive = ( code, result ) => (
	code.at(0) === code.at(-1)
	&&
	'"\'`'.search( code.at(0) ) !== -1
	&&
	code.substring( 1, code.length - 1 ) === result
)

/**
 * @typedef {Object} EvalFormationOptions
 * @property {string} code
 * @property {any} value
 * @property {import('./eval-flags-parser')} evalFlags
 * @property {boolean} isOutputRequired
 * @property {(value: object) => string | null} handleObject
 */

/**
 * @param {EvalFormationOptions} options
 * @returns {?string | null}
 */
function formatEvaled({
	code,
	value,
	evalFlags,
	isOutputRequired,
	handleObject,
}) {
	if( evalFlags.whats ){
		let type = typeof value

		if( type === 'object' ){
			if( value == null )
				type = 'a null'
			else
				type = `an ${type}, instance of ${value.constructor.name}`
		} else if( type !== 'undefined' )
			type = 'a ' + type

		return type
	}

	if( evalFlags.keys ){
		if( value == null )
			return `\`${String( value )}\` has no keys`

		evalFlags.prt = false
		const keys = Object.keys( value ).join( '` `' )
		return keys ? `keys: \`${keys}\`` : 'no keys'
	}

	if( evalFlags.prt )
		return `.: ${printify( value, evalFlags.prt.value || 3 )}`

	if( evalFlags.silent )
		return null

	switch( typeof value ){
		case 'undefined':
			return isOutputRequired && 'undefined'

		case 'boolean':
		case 'bigint':
		case 'symbol': {
			const string = String( value )

			if( !isOutputRequired && !evalFlags.cb && code === string )
				return null

			return string
		}

		case 'number':
			if( !isOutputRequired && !evalFlags.cb && isNumberPrimitive( code ) )
				return null

			return numsplit( value )

		case 'string':
			if( !isOutputRequired && !evalFlags.cb && isCodePrimitive( code, value ) )
				return null

			return value

		case 'object': {
			if( !isOutputRequired )
				return null

			if( value === null )
				return 'null'

			return handleObject( value )
		}

		case 'function': {
			let functionBody = String( value )
			let indentation = functionBody.matchFirst( /\n(\s+)[^\n]+$/ )

			if( indentation ){
				indentation = ( indentation.match( /\t/g )?.length ?? 0 ) + ( indentation.match( /\s{4}/g )?.length ?? 0 )
				functionBody = functionBody.replace( new RegExp( `^(\\t|[^\\t\\S]{4}){${indentation}}`, 'gm' ), '' )
			}

			evalFlags.cb = { value: 'js' }
			return functionBody
		}

		default:
			return `Result parse error: unknown type "${typeof value}" of evaled`
	}
}

module.exports = formatEvaled