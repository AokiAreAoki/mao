// eslint-disable-next-line no-global-assign
require = global.alias(require)

/** @type {import('@/libs/service-manager').Inclusion} */
module.exports = {
	id: "slash-commands",
	name: "Slash Command",
	init({ sb }){
		const localCommands = require( './commands' )
		const discord = require( 'discord.js' )
		const client = require( '@/instances/client' )

		sb.on( client, discord.Events.InteractionCreate, async i => {
			if( !i.isChatInputCommand() )
				return

			await localCommands.get( i.commandName ).callback(i)
		})
	}
}