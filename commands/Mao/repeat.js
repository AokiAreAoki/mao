module.exports = {
	requirements: 'MM',
	init: ( requirements, mao ) => {
		requirements.define( global )

		addCmd({
			aliases: 'repeat',
			description: 'repeats last command',
			callback: async msg => {
				msg.isCommand = false
				let commandMessage = await msg.getReferencedMessage()

				if( !commandMessage ){
					const messages = await msg.channel.messages.fetch({
						before: msg.id,
						limit: 100,
					}).catch( () => null )

					commandMessage = messages?.find( m => m.author.id === msg.author.id && m.isCommand )
				}

				if( commandMessage ){
					commandMessage.deleteAnswers()
					const message = await commandMessage.send( `Repeating the command... ${client.emojis.resolve( '822881934484832267' ) ?? ''}` )
					await MM.handleMessage( commandMessage, true )
					message.edit( `Repeating the command... ✅` )
					msg.delete()
					return
				}

				msg.channel.purge([
					msg,
					await msg.send( 'No commands found' ),
				], 3e3 )
			},
		})
	}
}