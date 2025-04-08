// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { SocksProxyAgent } = require( 'socks-proxy-agent' )

let dropCache = false

function refreshProxy(){
	dropCache = true
}

function socksProxy(){
	const tokens = require( '@/tokens.yml', dropCache )
	dropCache = false

	return tokens.booru_proxy?.uri
}

function proxyAgent() {
	return socksProxy()
		? new SocksProxyAgent( socksProxy() )
		: undefined
}

module.exports = {
	refreshProxy,
	socksProxy,
	proxyAgent,
}
