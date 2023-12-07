// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
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
					commandMessage.deleteAnswers( true )
					msg.channel.purge( [msg, commandMessage], 1337 )
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
