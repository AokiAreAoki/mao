// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { SocksProxyAgent } = require( 'socks-proxy-agent' )
const bakadb = require( '@/instances/bakadb' )

function socksProxy(){
	const socksProxy = bakadb.fallback({
		path: 'socksProxy',
		defaultValue: () => null,
	})

	return socksProxy
}

function proxyAgent() {
	return socksProxy
		? new SocksProxyAgent( socksProxy() )
		: undefined
}

module.exports = {
	socksProxy,
	proxyAgent,
}
