// eslint-disable-next-line no-global-assign
require = global.alias
const client = require( '@/instances/client' )
const bakadb = require( '@/instances/bakadb' )

module.exports = async function shutdown( code ){
	if( typeof code !== 'number' && code != null )
		return false

	if( code == null )
		code = 0

	bakadb.save( true )
	await client.destroy()

	code = isFinite( code ) ? Math.floor( code ) : NaN
	process.exit( isNaN( code ) ? 0 : code )
}