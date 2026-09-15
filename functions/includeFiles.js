const fs = require( 'fs' )
const pathLib = require( 'path' )

function iterate({
	path = process.cwd(),
	entities = [],
	query,
	callback,
	depth = 0
}){
	if( depth >= query.length )
		return

	const entity = query[depth]
	const children = fs.readdirSync( path )
		.map( child => {
			const newPath = pathLib.join( path, child )

			return {
				entity: child,
				path: newPath,
				isFile: fs.statSync( newPath ).isFile(),
			}
		})
		.filter( child => ( !entity.ignoreFiles || !child.isFile ) && entity.re.test( child.entity ) )

	++depth

	for( const e of children ){
		entities.push( e.entity )

		if( e.isFile ){
			callback({
				path: e.path,
				entities,
			})
		} else if( depth < query.length ){
			iterate({
				path: e.path,
				query,
				callback,
				depth,
				entities,
			})
		}

		entities.pop()
	}
}

const messageStack = []

const INDENTATION	= "   "
const PREFIX		= " - "
const ERROR_PREFIX	= "\\ "

function log( message, isError ){
	if( isError )
		message = ERROR_PREFIX + message

	if( messageStack.length > 1 ){
		const prefix = isError
			? INDENTATION
			: PREFIX

		message = prefix + message

		if( messageStack.length > 2 ){
			message = INDENTATION.repeat( messageStack.length - 2 ) + message
		}
	}

	process.stdout.write( message )
}

function extendParent( message ){
	if( messageStack.length > 1 ){
		const parent = messageStack.at(-2)

		if( parent.length === 0 ){
			// Move cursor by 3 characters to the left and overwrite "..." with ":  "
			process.stdout.write( '\x1b[3D:  \n' )
		}

		parent.push( message )
	}
}

function logSingle( message ){
	messageStack.push( [] )
		extendParent( message )
		log( message + '\n' )
	messageStack.pop()
}

function logPush( message ){
	const children = []
	messageStack.push( children )

	extendParent( message )

	log( message + '...' )
}

function logPop(){
	const children = messageStack.at(-1)

	if( children.length === 0 )
		process.stdout.write( 'OK\n' )

	messageStack.pop()
}

function logFail( message, error ){
	const children = messageStack.at(-1)

	if( children.length === 0 )
		process.stdout.write( 'ERROR\n' )

	log( message, true )
	messageStack.pop()
	throw error
}

/**
 * @typedef Params
 * @property {string} text
 * @property {string} query
 * @property {(result: unknown, path: string[]) => void} callback
 * @property {string} [cwd]
 *
 * @param {Params} params
 */
async function includeFiles({
	text,
	query,
	callback,
	cwd = process.cwd(),
}){
	logPush( text )

	query = query
		.split( /[/\\]+/ )
		.filter( entity => entity !== '.' )
		.map( ( entity, index, array ) => {
			if( entity === '**' )
				return {
					re: /.+/,
					ignoreFiles: true,
				}

			if( entity.indexOf( '**' ) !== -1 ){
				let query = array
					.slice( 0, index )
					.map( e => e + '/' )
					.join( '' )

				query += `${entity}\n${' '.repeat( "SyntaxError: ".length + query.length )}^^`
					+ `\nthis token can't be used like that`
					+ `\ndid you mean: \`${query + entity.replace( /\*\*/, '**/*' )}\`?`
					+ `\n`

				throw SyntaxError( `${query}` )
			}

			return {
				re: new RegExp( entity.replace( /\*/g, '.*' ) ),
				ignoreFiles: index === 0,
			}
		})

	iterate({
		query,
		callback: ({ path, entities }) => {
			try {
				const mod = require( path )
				callback( mod, Array.from( entities ) )
			} catch( error ){
				logFail( `callback call failed for "${path}":\n` )
			}
		},
		path: cwd,
	})

	logPop()
}

module.exports = {
	includeFiles,
	logPush,
	logPop,
	logFail,
	logSingle,
}