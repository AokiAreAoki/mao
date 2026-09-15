// eslint-disable-next-line no-global-assign
require = global.alias(require)
const {
	Client,
	Options,
	Sweepers,
	IntentsBitField,
	Events,
} = require( 'discord.js' )
const { flags } = require( '@/index' )
const tokens = require( '@/tokens.yml' )
const { dateLocale = 'ru' } = require( '@/config.yml' )

const client = new Client({
	restRequestTimeout: 60e3,
	makeCache: Options.cacheWithLimits({
		MessageManager: {
			sweepInterval: 300,
			sweepFilter: Sweepers.filterByLifetime({
				lifetime: 3600*4,
				getComparisonTimestamp: e => e.editedTimestamp ?? e.createdTimestamp,
			}),
		},
		ThreadManager: {
			sweepInterval: 3600,
			sweepFilter: Sweepers.filterByLifetime({
				getComparisonTimestamp: e => e.archiveTimestamp,
				excludeFromSweep: e => !e.archived,
			}),
		},
	}),
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildIntegrations,
		IntentsBitField.Flags.GuildVoiceStates,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.GuildMessageReactions,
		IntentsBitField.Flags.DirectMessages,
		IntentsBitField.Flags.DirectMessageReactions,
		IntentsBitField.Flags.MessageContent,
	],
})

client.on( Events.Error, err => {
	console.log( '[Client] Client error happened:' )
	process.emit( 'unhandledRejection', err )
})

client.once( Events.ClientReady, () => {
	module.exports.loggedIn = Date.now() - module.exports.initializedAt
	module.exports.isLoggedIn = true

	console.log( '[Client] Logged in as ' + client.user.tag )

	let online = true

	function reconnecting() {
		if( online ){
			online = false
			console.log( `[Client] [${new Date().toLocaleString( dateLocale )}] Reconnecting to discord...` )
		}
	}

	function disconnected() {
		console.log( `[Client] [${new Date().toLocaleString( dateLocale )}] Shard disconnected` )
	}

	function resume() {
		if( !online ){
			online = true
			console.log( `[Client] [${new Date().toLocaleString( dateLocale )}] Connection to discord is back` )
		}
	}

	client.on( Events.ShardReconnecting, reconnecting )
	client.on( Events.ShardDisconnect, disconnected )
	client.on( Events.ShardResume, resume )
	client.on( Events.ShardReady, resume )
})

client.whenReady = new Promise( resolve => {
	client.once( Events.ClientReady, resolve )
})

client.login( tokens.discord[flags.dev ? 'dev' : 'mao'] )
	.catch( err => {
		console.error( err )
		console.log( '[Client] Failed to log in. Exit.' )
		process.exit(2)
	})

module.exports = client
