// eslint-disable-next-line no-global-assign
require = global.alias
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
		console.log( '\nShutting down...' )

		process.stdout.write( 'Saving DB...' )
		bakadb.save( true )
		process.stdout.write( 'OK\n' )

		process.stdout.write( 'Logging out...' )
		await client.destroy()
		process.stdout.write( 'OK\n' )
	} else {
		console.log( 'Process has been terminated' )
	}

	code = isFinite( code ) ? Math.floor( code ) : NaN
	process.exit( isNaN( code ) ? 0 : code )
}