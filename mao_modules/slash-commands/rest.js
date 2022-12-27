// eslint-disable-next-line no-global-assign
require = global.alias
const discord = require( 'discord.js' )
const client = require( '@/instances/client' )

module.exports = new discord.REST({ version: '10' }).setToken( client.token )