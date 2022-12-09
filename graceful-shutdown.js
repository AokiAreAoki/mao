// eslint-disable-next-line no-global-assign
require = global.alias
const shutdown = require( '@/functions/shutdown' )
const killSignals = require( '@/kill-signals' )

killSignals.forEach( signal => {
	process.on( signal, () => {
		process.stdin.resume()
		shutdown( 228 )
	})
})