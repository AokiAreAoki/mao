// eslint-disable-next-line no-global-assign
require = global.alias
const client = require( '@/instances/client' )

module.exports = function processing( alt = 'Loading...' ){
	return String( client.emojis.resolve( '822881934484832267' ) ?? alt )
}