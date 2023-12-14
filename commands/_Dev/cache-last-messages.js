// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		addCommand({
			aliases: 'cache',
			description: `caches 100 last messages in current channel`,
			async callback({ msg, session }){
				const msgs = await msg.channel.cacheLastMessages()
				session.update( `Cached last ${msgs.length} messages in ${msg.channel}` )
			}
		})
	}
}