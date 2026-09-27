// eslint-disable-next-line no-global-assign
require = global.alias(require)

/**
 * @typedef InclusionParams
 * @property {ServiceBuilder} sb
 *
 * @typedef {(params: InclusionParams) => Promise<void>} InclusionFunc
 *
 * @typedef Inclusion
 * @property {string} id
 * @property {string} name
 * @property {boolean} [alwaysOn]
 * @property {InclusionFunc} init
**/

const Service = require( './Service' )
const ServiceBuilder = require( './ServiceBuilder' )
const ServiceManager = require( './ServiceManager' )
const StorageAdapter = require( './StorageAdapter' )

module.exports = {
	Service,
	ServiceBuilder,
	ServiceManager,
	StorageAdapter,
}