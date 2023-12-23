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
	if( text )
		process.stdout.write( text + '...' )

	query = query
		.split( /[/\\]+/ )
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
			} catch( err ){
				process.stdout.write( '\n' )
				throw err
			}
		},
	})

	if( text )
		process.stdout.write( 'OK\n' )
}
