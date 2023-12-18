// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const MM = require( '@/instances/message-manager' )
		const processing = require( '@/functions/processing' )

		addCommand({
			aliases: 'undo',
			description: 'removes last command or edited message',
			async callback({ msg, session }){
				msg.isCommand = false

				if( msg.hasBeenEdited ){
					await msg.react( processing( '👌' ) )
					await msg.deleteAnswers( true )
					await msg.delete()
					await MM.handleMessageDeletion( msg )
					return
				}

				const messages = await msg.channel.messages.fetch({
					before: msg.id,
					limit: 100,
				})

				const commandMessage = messages?.find( m => m.author.id === msg.author.id && m.isCommand )
				await msg.react( processing( '👌' ) )

				if( commandMessage ){
					commandMessage.isCommand = false

					await commandMessage.deleteAnswers( true )
					await msg.channel.purge([msg, commandMessage])
					await MM.handleMessageDeletion( commandMessage )

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
