// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const bakadb = require( '@/instances/bakadb' )
		const shutdown = require( '@/utils/shutdown' )

		addCommand({
			aliases: 'exit die',
			description: {
				single: 'guess what'
			},
			async callback({ msg, args }){
				bakadb.set( "restart", {
					message: msg.id,
					channel: msg.channel.id,
					timestamp: Date.now(),
				})

				await Promise.all([
					msg.react( '717396565114880020' ),
					msg.deleteAnswers(),
				])

				shutdown( parseInt( args[0] ) )
			},
		})
	}
}
