module.exports = {
	requirements: 'client',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd( 'undo', 'Removes edited message', async msg => {
			if( msg.edits.length > 1 ){
				await msg.react( client.emojis.cache.get( '717363212638748732' ) ?? '👌' )
				await msg.delete( 1337 )
				return
			}

			msg.channel.messages.fetch({
				before: msg.id,
				limit: 100,
			}).then( async messages => {
				const message = messages?.find( m => m.author.id === msg.author.id && m.isCommand )
			
				if( message ){
					await msg.react( client.emojis.cache.get( '717363212638748732' ) ?? '👌' )
					await message.channel.bulkDelete( message._answers )
					setTimeout( () => message.channel.bulkDelete( [msg, message] ), 1337 )
				} else
					msg.send( 'No commands found' )
			}).catch( console.log )
		})
	}
}