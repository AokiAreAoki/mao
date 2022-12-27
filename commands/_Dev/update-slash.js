// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const updateRemote = require( '@/mao_modules/slash-commands/update-remote' )
		const processing = require( '@/functions/processing' )
		const cb = require( '@/functions/cb' )

		addCommand({
			aliases: 'update-slash',
			description: 'updates remove slash commands',
			callback: async msg => {
				const m = msg.send( processing() )

				updateRemote()
					.then( async () => ( await m ).edit( `✅` ) )
					.catch( async err => ( await m ).edit( cb( err ) ) )
			},
		})
	}
}