// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { ServiceManager } = require( '@/libs/service-manager' )
const BakaDBStorageAdapter = require( '@/libs/bakadb-storage-adapter' )
const bakadb = require( '@/instances/bakadb' )
const MM = require( '@/instances/message-manager' )

const bakaDBstorageAdapter = new BakaDBStorageAdapter( bakadb, `service-manager` )

const serviceManager = new ServiceManager({
	storageAdapter: bakaDBstorageAdapter,
	messageManager: MM,
})

module.exports = serviceManager