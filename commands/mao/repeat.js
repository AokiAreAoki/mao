// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const MM = require( '@/instances/message-manager' )
		const processing = require( '@/utils/processing' )
		const metaDataStore = require( '@/instances/meta-data-store' )

		addCommand({
			aliases: 'repeat r',
			description: 'repeats last command',
			async callback({ msg, session }){
				metaDataStore.remove( msg, 'is-command' )

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

					commandMessage = messages?.find( m => m.author.id === msg.author.id && metaDataStore.resolve( m, 'is-command' ) )
				}

				if( commandMessage ){
					const processingReaction = processing( '👌' )
					const doneReaction = '✅'

					await msg.react( processingReaction )
					await MM.handleMessage( commandMessage, true )

					await msg.react( doneReaction )
					return msg.delete( 1337 )
				}

				msg.channel.purge([
					msg,
					await session.update( 'No commands found' ),
				], 3e3 )
			},
		})
	}
}
