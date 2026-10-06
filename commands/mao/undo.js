// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const MM = require( '@/instances/message-manager' )
		const processing = require( '@/utils/processing' )
		const metaDataStore = require( '@/instances/meta-data-store' )

		addCommand({
			aliases: 'undo',
			description: 'removes last command or edited message',
			async callback({ msg, session }){
				metaDataStore.remove( msg, 'is-command' )

				if( msg.hasBeenEdited ){
					await msg.react( processing( '👌' ) )
					await msg.deleteAnswers()
					await msg.delete()
					await MM.handleMessageDeletion( msg )
					return
				}

				const messages = await msg.channel.messages.fetch({
					before: msg.id,
					limit: 100,
				})

				const commandMessage = messages?.find( m => m.author.id === msg.author.id && metaDataStore.resolve( m, 'is-command' ) )
				await msg.react( processing( '👌' ) )

				if( commandMessage ){
					metaDataStore.remove( msg, 'is-command' )

					await commandMessage.deleteAnswers()
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
