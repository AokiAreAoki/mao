module.exports = {
	requirements: 'bakadb db client numsplit',
	init: ( requirements, mao ) => {
		requirements.define( global )

		client.once( 'ready2', () => {
			if( db.restart ){
				let timeleft = Date.now() - db.restart.timestamp
				let channel = client.channels.cache.get( db.restart.channel )

				if( channel && timeleft < 60e3 ){
					channel.send( embed()
						.setTitle( "🚀 Yay, I'm back again!" )
						.addField( "🏗️ Init",`\`${numsplit( mao.initializationTime )}ms\``, true )
						.addField( "📡 Login", `\`${numsplit( mao.loginTime )}ms\``, true )
						.addField( "🛠️ Overall", `\`${numsplit( timeleft )}ms\``, true )
						.setTimestamp( Date.now() )
					).then( async m => {
						await m.delete( 8000 )
						delete db.restart
						bakadb.save()
					}).catch( () => {} )
					
					channel.messages.fetch( db.restart.message )
						.then( m => m.delete( 1337 ) )
						.catch( () => {} )
				}
			}
		})

		addCmd( 'exit die', { short: 'guess what', full: 'r u srsly?' }, async ( msg, args ) => {
			db.restart = {
				message: msg.id,
				channel: msg.channel.id,
				timestamp: Date.now(),
			}
			bakadb.save()

			await msg.react( '717396565114880020' )
			await client.destroy()

			let code = Number( args[0] )
			process.exit( isNaN( code ) ? 0 : code )
		})
	}
}