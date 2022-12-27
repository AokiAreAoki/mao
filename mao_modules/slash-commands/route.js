// eslint-disable-next-line no-global-assign
require = global.alias
const discord = require( 'discord.js' )
const config = require( '@/config.yml' )
const flags = require( '@/index' )
const client = require( '@/instances/client' )

module.exports = {
	commands: commandID => flags.dev
		? discord.Routes.applicationGuildCommands( client.user.id, config.dev_guild, commandID )
		: discord.Routes.applicationCommands( client.user.id, commandID )
}