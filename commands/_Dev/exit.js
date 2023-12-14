// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { Events } = require( 'discord.js' )
		const bakadb = require( '@/instances/bakadb' )
		const { db } = bakadb
		const client = require( '@/instances/client' )
		const Embed = require( '@/functions/Embed' )
		const numsplit = require( '@/functions/numsplit' )
		const shutdown = require( '@/functions/shutdown' )

		client.once( Events.ClientReady, async () => {
			const {
				initializedIn,
				loggedIn,
			} = require( '@/index' )

			if( db.restart ){
				const timeleft = Date.now() - db.restart.timestamp
				const channel = await client.channels.fetch( db.restart.channel )

				if( channel && timeleft < 600e3 ){
					const embed = Embed()
						.setTitle( "🚀 Yay, I'm back again!" )
						.addFields(
							{
								name: "🏗️ Init",
								value:`\`${numsplit( initializedIn )}ms\``,
								inline: true
							},
							{
								name: "📡 Login",
								value: `\`${numsplit( loggedIn )}ms\``,
								inline: true
							},
							{
								name: "🛠️ Overall",
								value: `\`${numsplit( timeleft )}ms\``,
								inline: true
							},
						)
						.setTimestamp( Date.now() )

					channel.send( embed )
						.then( async m => {
							m.purge( 5e3 )
							delete db.restart
							bakadb.save()
						})
						.catch( () => {} )

					channel.messages.fetch( db.restart.message )
						.then( m => m.purge( 1337 ) )
						.catch( () => {} )

					channel.cacheLastMessages()
				}
			}
		})

		addCommand({
			aliases: 'exit die',
			description: {
				single: 'guess what'
			},
			async callback({ msg, args }){
				db.restart = {
					message: msg.id,
					channel: msg.channel.id,
					timestamp: Date.now(),
				}

				await Promise.all([
					msg.react( '717396565114880020' ),
					msg.deleteAnswers( true ),
				])

				shutdown( parseInt( args[0] ) )
			},
		})
	}
}
