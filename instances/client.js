// eslint-disable-next-line no-global-assign
require = global.alias
const { flags } = require( '@/index' )
const tokens = require( '@/tokens.yml' )
const discord = require( 'discord.js' )

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
		discord.IntentsBitField.Flags.Guilds,
		discord.IntentsBitField.Flags.GuildMessages,
		discord.IntentsBitField.Flags.GuildIntegrations,
		discord.IntentsBitField.Flags.GuildVoiceStates,
		discord.IntentsBitField.Flags.GuildMessages,
		discord.IntentsBitField.Flags.GuildMessageReactions,
		discord.IntentsBitField.Flags.DirectMessages,
		discord.IntentsBitField.Flags.DirectMessageReactions,
		discord.IntentsBitField.Flags.MessageContent,
	],
})

client.login( tokens.discord[flags.dev ? 'dev' : 'mao'] )
	.catch( err => {
		console.error( err )
		console.log( 'Failed to log in. Exit.' )
		process.exit(2)
	})

client.on( discord.Events.Error, err => {
	console.log( 'Client error happened:' )
	process.emit( 'unhandledRejection', err )
})

module.exports = client