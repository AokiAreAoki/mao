module.exports = {
	iom: 'mao',
	flags: {},
	startedAt: Date.now(),
	initializedAt: -1,
	loggedIn: -1,
}

process.argv.slice(2).forEach( flag => {
	module.exports.flags[flag] = true
})

if( module.exports.flags.dev )
	module.exports.iom = 'dev'

require( './alias' )
// eslint-disable-next-line no-global-assign
require = global.alias
const log = console.log
const fs = require( 'fs' )
const client = require( '@/instances/client' )
const numsplit = require( '@/functions/numsplit' )
const includeFiles = require( '@/functions/includeFiles' )
require( '@/methods/_all' )()

if( !fs.existsSync( './tokens.yml' ) ){
	console.log( '\nFile "tokens.yml" does not exist, exit.' )
	process.exit( 228 )
}

client.once( 'ready', () => {
	module.exports.loggedIn = Date.now() - module.exports.initializedAt
	console.log( 'Logged in as ' + client.user.tag )

	client.on( 'ready', () => {
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
	query: 'mao_modules/*.js',
	callback: inclusion => inclusion.init({}),
})

// Including commands
const CM = require( '@/instances/command-manager' )

includeFiles({
	text: 'Including commands',
	query: 'commands/**/*.js',
	callback( inclusion, [, moduleFolder] ){
		const moduleIsHidden = moduleFolder[0] === '_'
		const moduleName = moduleFolder.substring( moduleIsHidden ? 1 : 0 )
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
log( `\nInitialization finished in ${numsplit( module.exports.initializedIn )}ms, logging in...` )