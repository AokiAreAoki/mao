let runMao = true
const maoFlags = new Set()

const flagCallbacks = {
	'dev'(){
		maoFlags.add( 'dev' )
	},
	'flags'(){
		runMao = false
		console.log( 'List of all flags:' )
		console.log( Object.keys( flagCallbacks )
			.map( f => `  --${f}` )
			.join( '\n' )
		)
	},
}

process.argv.slice(2).forEach( arg => {
	if( !arg.startsWith( '--' ) )
		return

	const flagName = arg.substring(2).toLowerCase()
	const callback = flagCallbacks[flagName]

	if( typeof callback !== 'function' )
		throw Error( `Unknown flag "${arg}". Run Mao with "--flags" flag to see all flags` )

	callback()
})

if( !runMao )
	return

const cp = require( 'child_process' )
const killSignals = require( './kill-signals' )
require( './methods/Set.join' )()

function log( ...args ){
	if( args.length === 0 )
		return console.log()

	console.log( '[Wrapper]', ...args )
}

if( maoFlags.size === 0 )
	log( `Running Mao with no flags\n` )
else
	log( `Running Mao with next flags: ${maoFlags.join( ', ' )}\n` )

let timeout = 0
let reset = 0
let mao = null
let shutdown = false

function intercept(){
	process.stdin.resume()
	shutdown = true

	if( mao ){
		setTimeout( () => {
			log( 'Mao took too long to shutdown. Force exit.' )
			process.exit()
		}, 5e3 )
	} else
		process.exit()
}

killSignals.forEach( signal => process.on( signal, intercept ) )

function start(){
	mao = cp.fork( __dirname + '/index.js', [process.pid, ...maoFlags], { detached: false } )

	if( process.platform === 'win32' ){
		cp.exec( `wmic process where "ProcessID=${process.pid}" CALL setpriority "above normal"` )
		cp.exec( `wmic process where "ProcessID=${mao.pid}" CALL setpriority "above normal"` )
	} else {
		// here could be linux's nice
		//cp.exec( `nice...` )
	}

	mao.once( 'exit', code => {
		mao = null

		log()
		log( `Mao exited with code ${code}` )

		if( code == 228 || shutdown ){ // full exit code (will not restart)
			log( `Full exit code received. Mao won't be restarted.` )
			process.exit()
		}

		if( code === 0 ){
			log( 'Restarting...\n' )
			start()
		} else {
			if( reset < Date.now() )
				timeout = 0

			if( timeout < 10 )
				timeout += Math.ceil( ( 10 - timeout ) * .25 )

			log( `Restart in`, timeout, `seconds` )
			log()
			setTimeout( start, timeout * 1e3 )
			reset = Date.now() + 30e3
		}
	})
}

start()