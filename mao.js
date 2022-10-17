const log = console.log
let runMao = true
const maoFlags = new Set()

const flagCallbacks = {
	'dev'(){
		maoFlags.add( 'dev' )
	},
	'flags'(){
		runMao = false
		log( 'List of all flags:' )
		log( Object.keys( flagCallbacks )
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
require( './methods/Set.join' )()

if( maoFlags.size === 0 )
	log( `Running Mao with no flags\n` )
else
	log( `Running Mao with next flags: ${maoFlags.join( ', ' )}\n` )

let timeout = 0
let reset = 0

function start(){
	const mao = cp.fork( __dirname + '/index.js', Array.from( maoFlags ) )

	if( process.platform === 'win32' ){
		cp.exec( `wmic process where "ProcessID=${process.pid}" CALL setpriority "above normal"` )
		cp.exec( `wmic process where "ProcessID=${mao.pid}" CALL setpriority "above normal"` )
	} else {
		// here could be linux's nice
		//cp.exec( `nice...` )
	}

	mao.once( 'exit', code => {
		console.log( `\nMao exited with code ${code}` )

		if( code == 228 ) // full exit code (will not restart)
			return console.log( `Full exit code received. Mao won't be restarted.` )

		if( code === 0 ){
			console.log( 'Restarting...\n' )
			start()
		} else {
			if( reset < Date.now() )
				timeout = 0

			if( timeout < 10 )
				timeout += Math.ceil( ( 10 - timeout ) * .25 )

			console.log( `Restart in`, timeout, `seconds\n` )
			setTimeout( start, timeout * 1e3 )
			reset = Date.now() + 30e3
		}
	})
}

start()