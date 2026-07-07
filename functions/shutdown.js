// eslint-disable-next-line no-global-assign
require = global.alias(require)
const client = require( '@/instances/client' )
const bakadb = require( '@/instances/bakadb' )
const index = require( '@/index' )

let tryingToShutdown = 0

module.exports = async function shutdown( code ){
	if( ( typeof code !== 'number' && code != null ) || tryingToShutdown > Date.now() )
		return

	if( code == null )
		code = 0

	if( index.isLoggedIn ){
		tryingToShutdown = Date.now() + 5e3
		console.log( '\n[Shutdown] Shutting down...' )

		console.log( '[Shutdown] Saving DB...' )
		bakadb.save( true )
		console.log( '[Shutdown] DB Saved.' )

		console.log( '[Shutdown] Logging out...' )
		await client.destroy()
		console.log( '[Shutdown] Logged out.' )
	} else {
		console.log( '[Shutdown] Process has been terminated' )
	}

	code = isFinite( code ) ? Math.floor( code ) : NaN
	process.exit( isNaN( code ) ? 0 : code )
}