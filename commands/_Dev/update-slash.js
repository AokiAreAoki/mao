// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const updateRemote = require( '@/mao_modules/slash-commands/update-remote' )
		const processing = require( '@/functions/processing' )
		const cb = require( '@/functions/cb' )

		addCommand({
			aliases: 'update-slash',
			description: 'updates remote slash commands',
			callback: async ({ session }) => {
				session.update( processing() )

				updateRemote()
					.then( () => session.update( `✅` ) )
					.catch( err => session.update( cb( err ) ) )
			},
		})
	}
}