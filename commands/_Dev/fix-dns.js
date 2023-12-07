// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const fs = require( 'fs' )
		const cb = require( '@/functions/cb' )

		const ip = `192.168.104.1`
		const path = `/etc/resolv.conf`

		addCommand({
			aliases: 'fix-dns',
			description: `remove \`${ip}\` from \`${path}\``,
			async callback({ session }){
				if( !fs.existsSync( path ) )
					return session.update( `The \`${path}\` does not exist` )

				try {
					const content = fs
						.readFileSync( path )
						.toString()
						.split( '\n' )
						.filter( l => l.indexOf( ip ) === -1 )
						.join( '\n' )

					fs.writeFileSync( path, content )
					return session.update( cb( content ) )
				} catch( error ){
					return session.update( cb( error ) )
				}
			}
		})
	}
}