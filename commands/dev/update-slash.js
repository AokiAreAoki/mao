// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const updateRemote = require( '@/services/slash-commands/update-remote' )
		const processing = require( '@/utils/processing' )
		const cb = require( '@/utils/cb' )

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