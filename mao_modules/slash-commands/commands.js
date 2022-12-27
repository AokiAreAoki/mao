// eslint-disable-next-line no-global-assign
require = global.alias
const discord = require( 'discord.js' )
const TimeSplitter = require( '@/re/time-splitter' )

const commands = [
	{
		data: new discord.SlashCommandBuilder()
			.setName( 'ping' )
			.setDescription( 'ping-pong' )
		,
		callback: i => i.reply( 'Pong!' ),
	},
	{
		data: new discord.SlashCommandBuilder()
			.setName( 'uptime' )
			.setDescription( 'returns current uptime' )
		,
		callback: i => {
			const uptime = new TimeSplitter({
				// eslint-disable-next-line no-undef
				seconds: Math.floor( process.uptime() ),
			}).toString({
				maxTU: 2,
				ignoreZeros: true,
				separator: `, `,
			})

			return i.reply( `Uptime: ` + uptime )
		},
	},
]

module.exports = new Map( commands.map( cmd => [cmd.data.name, cmd] ) )
module.exports.commandData = commands.map( cmd => cmd.data.toJSON() )