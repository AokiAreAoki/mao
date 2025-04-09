// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { SocksProxyAgent } = require( 'socks-proxy-agent' )

/**
 * @typedef {"yt-dlp" | "booru"} ProxyType
 * @typedef {Record<ProxyType, string | null>} ProxyOptions
*/

/** @type {Set<ProxyType>} */
const PROXY_TYPES = new Set(["yt-dlp", "booru"])

/** @type {ProxyOptions} */
const cache = {
	"yt-dlp": null,
	"booru": null,
}

/** @param {ProxyType} proxyType */
function refreshProxy( proxyType ){
	if( proxyType !== 'all' && !PROXY_TYPES.has( proxyType ) )
		throw new TypeError( `Invalid proxy type: ${proxyType}. Use one of [${Array.from( PROXY_TYPES ).join( ", " )}] or "all" keyword.` )

	if( proxyType === 'all' ){
		for( const type of PROXY_TYPES )
			cache[type] = null
	} else {
		cache[proxyType] = null
	}
}

/** @param {ProxyType} proxyType */
function getSocksProxy( proxyType ){
	return ( cache[proxyType] ??= require( '@/tokens.yml', true ).proxies?.[proxyType] || {} )?.uri
}

/** @param {ProxyType} proxyType */
function getProxyAgent( proxyType ) {
	return getSocksProxy()
		? new SocksProxyAgent( getSocksProxy( proxyType ) )
		: undefined
}

module.exports = {
	PROXY_TYPES,
	refreshProxy,
	getSocksProxy,
	getProxyAgent,
}
