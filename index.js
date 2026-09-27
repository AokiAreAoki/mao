module.exports = {
	iom: 'mao',
	flags: {},
	verbose: {
		SM: false, // Service Manager
	},
	startedAt: Date.now(),
	initializedIn: -1,
	initializedAt: -1,
	isLoggedIn: false,
	loggedIn: -1,
}

setInterval( () => {
	process.send( 'hb' )
}, 5e3 )

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

const toVerbose = ( process.env.VERBOSE || '' )
	.toUpperCase()
	.split( ',' )

for( const key in module.exports.verbose ){
	if( toVerbose.includes( key ) )
		module.exports.verbose[key] = true
}

require( './alias' )
// eslint-disable-next-line no-global-assign
require = global.alias(require)
require( '@/graceful-shutdown' )
const services = require( '@/services' )
const numsplit = require( '@/utils/numsplit' )
const { includeFiles } = require( '@/utils/includeFiles' )
const sendAfterRestartMessage = require( '@/utils/sendAfterRestartMessage' )

async function main() {
	// Including methods //
	includeFiles({
		text: '[Index] Declaring custom methods',
		query: 'methods/*.js',
		callback: method => void method(),
	})

	// Initializing services //
	await services.init()

	// End
	module.exports.initializedIn = Math.round( Date.now() - module.exports.startedAt )
	module.exports.initializedAt = Date.now()
	console.log( `\n[Index] Initialization finished in ${numsplit( module.exports.initializedIn )}ms, logging in...` )

	sendAfterRestartMessage()
}

main()