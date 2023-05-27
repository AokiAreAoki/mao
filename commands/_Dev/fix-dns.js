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
			async callback( msg ){
				if( !fs.existsSync( path ) )
					return msg.send( `The \`${path}\` does not exist` )

				try {
					const content = fs
						.readFileSync( path )
						.toString()
						.split( '\n' )
						.filter( l => l.indexOf( ip ) === -1 )
						.join( '\n' )

					fs.writeFileSync( path, content )
					return await msg.send( cb( content ) )
				} catch( error ){
					return msg.send( cb( error ) )
				}
			}
		})
	}
}