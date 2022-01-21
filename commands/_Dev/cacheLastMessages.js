module.exports = {
	requirements: '',
	init: ( requirements, mao ) => {
		requirements.define( global )

		addCmd({
			aliases: 'cache',
			description: `caches 100 last messages in current channel`,
			async callback( msg ){
				const msgs = await msg.channel.cacheLastMessages()
				msg.send( `Cached last ${msgs.length} messages in ${msg.channel}` )
			}
		})
	}
}