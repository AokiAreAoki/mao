module.exports = {
	iom: 'mao',
	flags: {},
	startedAt: Date.now(),
	initializedIn: -1,
	initializedAt: -1,
	isLoggedIn: false,
	loggedIn: -1,
}

const args = process.argv.slice(2)
let wrapperPID = parseInt( args[0] )

if( !isNaN( wrapperPID ) ){
	args.shift()
}

args.forEach( flag => {
	module.exports.flags[flag] = true
})

if( module.exports.flags.dev )
	module.exports.iom = 'dev'

require( './alias' )
// eslint-disable-next-line no-global-assign
require = global.alias(require)
require( '@/graceful-shutdown' )
const { Events } = require( 'discord.js' )
const numsplit = require( '@/functions/numsplit' )
const includeFiles = require( '@/functions/includeFiles' )

// Including methods //
includeFiles({
	text: 'Including methods',
	query: 'methods/*.js',
	callback: method => void method(),
})

// On client ready
const client = require( '@/instances/client' )

client.once( Events.ClientReady, () => {
	module.exports.loggedIn = Date.now() - module.exports.initializedAt
	module.exports.isLoggedIn = true

	console.log( 'Logged in as ' + client.user.tag )

	let online = true

	function reconnecting() {
		if( online ){
			online = false
			console.log( `[${new Date().toLocaleString( 'ru' )}] Reconnecting to discord...` )
		}
	}

	function disconnected() {
		console.log( `[${new Date().toLocaleString( 'ru' )}] Shard disconnected` )
	}

	function resume() {
		if( !online ){
			online = true
			console.log( `[${new Date().toLocaleString( 'ru' )}] Connection to discord is back` )
		}
	}

	client.on( Events.ShardReconnecting, reconnecting )
	client.on( Events.ShardDisconnect, disconnected )
	client.on( Events.ShardResume, resume )
	client.on( Events.ShardReady, resume )
})

// Initializing instances //
includeFiles({
	text: 'Initializing instances',
	query: 'instances/*.js',
	callback: () => {},
})

// Initializing modules //
includeFiles({
	text: 'Initializing mao modules',
	query: 'mao_modules/*(.js)?/index.js',
	callback: inclusion => inclusion.init({}),
})

// Initializing command modules //
// Modules
const CM = require( '@/instances/command-manager' )
const folderLookup = new Map()

includeFiles({
	text: 'Initializing command modules',
	query: 'commands/**/index.js',
	callback: ( settings, [, folder] ) => {
		const module = CM.addModule( settings )
		folderLookup.set( folder, module )
	},
})

// Commands
includeFiles({
	text: 'Initializing commands',
	query: 'commands/**/*(.js)?/index.js',
	callback( inclusion, path ){
		const [, folder, file] = path

		if( file === 'index.js' )
			return

		if( typeof inclusion?.init !== 'function' ){
			setTimeout( () => {
				console.warn( `[Warning] "${path.join( '/' )}" command does not have the init function` )
			}, 1 )

			return
		}

		const module = folderLookup.get( folder )

		if( !module ){
			setTimeout( () => {
				console.warn( `[Warning] "${folder}" module was not initiated` )
			}, 1 )

			return
		}

		inclusion.init({
			addCommand: options => {
				return CM.addCommand({ ...options, module })
			},
		})
	}
})

// End
module.exports.initializedIn = Math.round( Date.now() - module.exports.startedAt )
module.exports.initializedAt = Date.now()
console.log( `\nInitialization finished in ${numsplit( module.exports.initializedIn )}ms, logging in...` )