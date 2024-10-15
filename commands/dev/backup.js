// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const fs = require( 'fs' )
		const { join } = require( 'path' )
		const bakadb = require( '@/instances/bakadb' )
		const cb = require( '@/functions/cb' )

		const NOT_FOUND = -1

		addCommand({
			aliases: 'get-backup backup',
			description: 'saves and send a copy of the DB in PMs',
			async callback({ msg, session }){
				bakadb.save( true )

				try {
					const lastSave = fs.readdirSync( bakadb.path )
						.map( filename => parseInt( filename ) )
						.filter( n => !isNaN(n) )
						.reduce( ( a, b ) => Math.max( a, b ), NOT_FOUND )

					if( lastSave === NOT_FOUND )
						return session.update( 'No saves found' )

					const path = join( bakadb.path, lastSave.toString() )

					await msg.author.send({ files: [path] })
					await msg.react( '✅' )
				} catch( err ){
					session.update( cb( err ) )
				}
			},
		})
	}
}