// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { refreshProxy } = require( '@/instances/proxy' )

		addCommand({
			aliases: 'refresh-proxy',
			description: 'Refresh proxy settings',
			async callback({ msg }){
				refreshProxy()
				return msg.react( '✅' )
			},
		})
	}
}