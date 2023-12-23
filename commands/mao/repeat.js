// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const MM = require( '@/instances/message-manager' )
		const processing = require( '@/functions/processing' )

		addCommand({
			aliases: 'repeat',
			description: 'repeats last command',
			async callback({ msg, session }){
				msg.isCommand = false
				let commandMessage = await msg.getReferencedMessage()

				if( commandMessage ){
					if( commandMessage.author.id !== msg.author.id && !msg.author.isMaster() )
						return session.update( `That's not yours` )
				} else {
					const messages = await msg.channel.messages
						.fetch({
							before: msg.id,
							limit: 100,
						})
						.catch( () => null )

					commandMessage = messages?.find( m => m.author.id === msg.author.id && m.isCommand )
				}

				if( commandMessage ){
					commandMessage.deleteAnswers()
					const message = await commandMessage.send( `Repeating the command... ${processing('')}` )
					await MM.handleMessage( commandMessage, true )
					message.edit( `Repeating the command... ✅` )
					msg.delete()
					return
				}

				msg.channel.purge([
					msg,
					await session.update( 'No commands found' ),
				], 3e3 )
			},
		})
	}
}
