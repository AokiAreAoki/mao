module.exports = {
	requirements: 'client',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd( 'undo', 'Removes edited message', async msg => {
			if( msg.edits.length > 1 ){
				await msg.react( client.emojis.cache.get( '717363212638748732' ) || '👌' )
				await msg.delete( 1337 )
			} else
				msg.react( client.emojis.cache.get( '717358214185746543' ) || '🤔' )
		})
	}
}