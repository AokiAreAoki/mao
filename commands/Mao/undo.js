module.exports = {
	requirements: 'client',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'undo',
			description: 'removes last command or edited message',
			callback: async msg => {
				msg.isCommand = false
				
				if( msg.hasBeenEdited ){
					await msg.react( client.emojis.cache.get( '822881934484832267' ) ?? '👌' )
					await msg.delete( 1337 )
					return
				}

				msg.channel.messages.fetch({
					before: msg.id,
					limit: 100,
				}).then( async messages => {
					const message = messages?.find( m => m.author.id === msg.author.id && m.isCommand )
				
					if( message ){
						await msg.react( client.emojis.cache.get( '822881934484832267' ) ?? '👌' )
						await message.channel.bulkDelete( message._answers )
						await message.channel.bulkDelete( [msg, message] )
					} else {
						msg.isCommand = true
						msg.send( 'No commands found' )
					}
				}).catch( console.log )
			},
		})
	}
}