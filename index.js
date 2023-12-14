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

// Including methods
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

	client.on( Events.ShardReady, () => {
		console.log( "I'm back" )
	})
})

// Initializing instances
includeFiles({
	text: 'Initializing instances',
	query: 'instances/*.js',
	callback: () => {},
})

// Including modules
includeFiles({
	text: 'Including modules',
	query: 'mao_modules/*(.js)?/index.js',
	callback: inclusion => inclusion.init({}),
})

// Including commands
const CM = require( '@/instances/command-manager' )

includeFiles({
	text: 'Including commands',
	query: 'commands/**/*(.js)?/index.js',
	callback( inclusion, [, moduleFolder] ){
		const moduleIsHidden = moduleFolder[0] === '_'
		const moduleName = moduleIsHidden
			? moduleFolder.substring(1)
			: moduleFolder

		const module = CM.addModule( moduleName, moduleIsHidden )

		inclusion.init({
			addCommand: options => {
				options.module = module
				return CM.addCommand( options )
			},
		})
	}
})

// End
module.exports.initializedIn = Math.round( Date.now() - module.exports.startedAt )
module.exports.initializedAt = Date.now()
console.log( `\nInitialization finished in ${numsplit( module.exports.initializedIn )}ms, logging in...` )