// eslint-disable-next-line no-global-assign
require = global.alias
const discord = require( 'discord.js' )
const config = require( '@/config.yml' )

module.exports = function Embed(){
	return new discord.EmbedBuilder().setColor( config.maoclr )
}
