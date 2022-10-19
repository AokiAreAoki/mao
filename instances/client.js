// eslint-disable-next-line no-global-assign
require = global.alias
const { flags } = require( '@/index' )
const tokens = require( '@/tokens.yml' )
const discord = require( 'discord.js' )

discord.Message
const client = new discord.Client({
	restRequestTimeout: 60e3,
	makeCache: discord.Options.cacheWithLimits({
		MessageManager: {
			sweepInterval: 300,
			sweepFilter: discord.Sweepers.filterByLifetime({
				lifetime: 3600*4,
				getComparisonTimestamp: e => e.editedTimestamp ?? e.createdTimestamp,
			}),
		},
		ThreadManager: {
			sweepInterval: 3600,
			sweepFilter: discord.Sweepers.filterByLifetime({
				getComparisonTimestamp: e => e.archiveTimestamp,
				excludeFromSweep: e => !e.archived,
			}),
		},
	}),
	intents: [
		'GUILDS',
		//'GUILD_MEMBERS',
		//'GUILD_BANS',
		//'GUILD_EMOJIS',
		'GUILD_INTEGRATIONS',
		//'GUILD_WEBHOOKS',
		//'GUILD_INVITES',
		'GUILD_VOICE_STATES',
		//'GUILD_PRESENCES',
		'GUILD_MESSAGES',
		'GUILD_MESSAGE_REACTIONS',
		//'GUILD_MESSAGE_TYPING',
		'DIRECT_MESSAGES',
		'DIRECT_MESSAGE_REACTIONS',
		//'DIRECT_MESSAGE_TYPING',
	],
})

client.login( tokens.discord[flags.dev ? 'dev' : 'mao'] )
	.catch( err => {
		console.error( err )
		console.log( 'Failed to log in. Exit.' )
		process.exit(2)
	})

client.on( 'error', err => {
	console.log( 'Client error happaned:' )
	console.log( err )
})

module.exports = client