// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const fs = require( 'fs' )
		const { join } = require( 'path' )
		const bakadb = require( '@/instances/bakadb' )

		addCommand({
			aliases: 'get-backup backup',
			description: 'saves and send a copy of the DB in PMs',
			callback( msg ){
				bakadb.save( true )
				
				const lastSave = fs.readdirSync( bakadb.path )
					.map( filename => parseInt( filename ) )
					.filter( n => !isNaN(n) )
					.reduce( ( a, b ) => Math.max( a, b ), 0 )
					.toString()

				return msg.author.send({
					files: [join( bakadb.path, lastSave )]
				})
					.then( () => msg.react( '✅' ) )
					.catch( err => msg.sendcb( err ) )
			},
		})
	}
}