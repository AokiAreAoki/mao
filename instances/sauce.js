// eslint-disable-next-line no-global-assign
require = global.alias
const SauceNAO = require( '@/re/saucenao-wrapper' )
const { saucenao: token } = require( '@/tokens.yml' )

module.exports = new SauceNAO({
	output_type: 2,
	api_key: token,
	db: 999,
	numres: 10,
	dedupe: 0,
	// hide: 0,
	// testmode: 1,
})