// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const fs = require( 'fs' )
		const { join } = require( 'path' )
		const bakadb = require( '@/instances/bakadb' )
		const cb = require( '@/functions/cb' )

		addCommand({
			aliases: 'get-backup backup',
			description: 'saves and send a copy of the DB in PMs',
			async callback({ msg, session }){
				bakadb.save( true )

				try {
					const lastSave = fs.readdirSync( bakadb.path )
						.map( filename => parseInt( filename ) )
						.filter( n => !isNaN(n) )
						.reduce( ( a, b ) => Math.max( a, b ), 0 )
						.toString()

					if( lastSave === 0 )
						return session.update( 'No saves found' )

					await msg.author.send({
						files: [join( bakadb.path, lastSave )]
					})

					await msg.react( '✅' )
				} catch( err ){
					session.update( cb( err ) )
				}
			},
		})
	}
}