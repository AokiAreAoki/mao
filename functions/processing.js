// eslint-disable-next-line no-global-assign
require = global.alias(require)
const client = require( '@/instances/client' )

module.exports = function processing( alt = 'Loading...' ){
	return client.emojis.resolve( '822881934484832267' ) ?? alt
}