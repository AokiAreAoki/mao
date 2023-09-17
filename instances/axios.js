// eslint-disable-next-line no-global-assign
require = global.alias
const axios = require( 'axios' )
const proxyAgent = require( '@/instances/proxyAgent' )

module.exports = axios.create({
	httpAgent: proxyAgent,
	httpsAgent: proxyAgent,
})