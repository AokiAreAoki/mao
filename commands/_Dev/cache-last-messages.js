// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		addCommand({
			aliases: 'cache',
			description: `caches 100 last messages in current channel`,
			async callback( msg ){
				const msgs = await msg.channel.cacheLastMessages()
				msg.send( `Cached last ${msgs.length} messages in ${msg.channel}` )
			}
		})
	}
}