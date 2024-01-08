module.exports = {
	init(){
		const localCommands = require( './commands' )

		// eslint-disable-next-line no-global-assign
		require = global.alias(require)
		const discord = require( 'discord.js' )
		const client = require( '@/instances/client' )

		client.on( discord.Events.InteractionCreate, async i => {
			if( !i.isChatInputCommand() )
				return

			await localCommands.get( i.commandName ).callback(i)
		})
	}
}