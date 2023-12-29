// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { SocksProxyAgent } = require( 'socks-proxy-agent' )
const bakadb = require( '@/instances/bakadb' )

module.exports = function proxyAgent() {
	const socksProxy = bakadb.fallback({
		path: 'socksProxy',
		defaultValue: () => null,
	})

	return socksProxy
		? new SocksProxyAgent( socksProxy )
		: undefined
}