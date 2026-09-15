// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { ServiceManager } = require( '@/libs/service-manager' )
const BakaDBStorageAdapter = require( '@/libs/bakadb-storage-adapter' )
const bakadb = require( '@/instances/bakadb' )

const SERVICES_STATE_PATH = `services/state`

const bakaDBstorageAdapter = new BakaDBStorageAdapter( bakadb, SERVICES_STATE_PATH )

const serviceManager = new ServiceManager( bakaDBstorageAdapter )

module.exports = serviceManager