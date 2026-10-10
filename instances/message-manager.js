// eslint-disable-next-line no-global-assign
require = global.alias(require)
const MessageManager = require( '@/libs/message-manager' )
const client = require( '@/instances/client' )
const metaDataStore = require( '@/instances/meta-data-store' )

const MM = new MessageManager({
	client,
	handleEdits: true,
	handleDeletion: true,
	metaDataStore,
})

module.exports = MM