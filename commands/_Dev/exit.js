module.exports = {
	requirements: 'bakadb db client numsplit _exit',
	init: ( requirements, mao ) => {
		requirements.define( global )

		client.once( 'ready2', () => {
			if( db.restart ){
				let timeleft = Date.now() - db.restart.timestamp
				let channel = client.channels.cache.get( db.restart.channel )

				if( channel && timeleft < 60e3 ){
					channel.send( Embed()
						.setTitle( "🚀 Yay, I'm back again!" )
						.addField( "🏗️ Init",`\`${numsplit( mao.initializationTime )}ms\``, true )
						.addField( "📡 Login", `\`${numsplit( mao.loginTime )}ms\``, true )
						.addField( "🛠️ Overall", `\`${numsplit( timeleft )}ms\``, true )
						.setTimestamp( Date.now() )
					).then( async m => {
						m.purge( 5e3 )
						delete db.restart
						bakadb.save()
					}).catch( () => {} )
					
					channel.messages.fetch( db.restart.message )
						.then( m => m.delete( 1337 ) )
						.catch( () => {} )
				}
			}
		})

		addCmd({
			aliases: 'exit die',
			description: {
				short: 'guess what',
				full: 'r u srsly?'
			},
			callback: async ( msg, args ) => {
				db.restart = {
					message: msg.id,
					channel: msg.channel.id,
					timestamp: Date.now(),
				}
				
				await msg.react( '717396565114880020' )
				_exit( parseInt( args[0] ) )
			},
		})
	}
}