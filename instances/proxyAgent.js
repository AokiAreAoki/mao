// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { SocksProxyAgent } = require( 'socks-proxy-agent' )
const config = require( '@/config.yml' )

// Use proxy if launched on linux (usually means on the host)
const proxyAgent = process.platform === 'linux'
	? new SocksProxyAgent( config.socksProxy )
	: undefined

module.exports = proxyAgent