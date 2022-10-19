// eslint-disable-next-line no-global-assign
require = global.alias
const fs = require( 'fs' )
const pathLib = require( 'path' )

function iterate({
	path = '.',
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

	children.forEach( e => {
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
	})
}

module.exports = function includeFiles({ text, query, callback }){
	// eslint-disable-next-line no-undef
	if( text )
		process.stdout.write( text + '...' )

	query = query
		.split( /[/\\]+/ )
		.map( ( e, i, array ) => {
			if( e === '**' )
				return {
					re: /.+/,
					ignoreFiles: true,
				}

			if( e.indexOf( '**' ) !== -1 ){
				let query = array
					.slice( 0, i )
					.map( e => e + '/' )
					.join( '' )

				query += `${e}\n${' '.repeat( "SyntaxError: ".length + query.length )}^^`
					+ `\nthis token can't be used like that`
					+ `\ndid you mean: \`${query + e.replace( /\*\*/, '**/*' )}\`?`
					+ `\n`

				throw SyntaxError( `${query}` )
			}

			return {
				re: new RegExp( e.replace( /\*/g, '.*' ) ),
				ignoreFiles: false,
			}
		})

	iterate({
		query,
		callback: ({ path, entities }) => {
			try {
				const mod = require( './' + path )
				callback( mod, entities )
			} catch( err ){
				// eslint-disable-next-line no-undef
				process.stdout.write( '\n' )
				throw err
			}
		},
	})

	// eslint-disable-next-line no-undef
	if( text )
		process.stdout.write( 'OK\n' )
}