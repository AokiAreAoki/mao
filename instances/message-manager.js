// eslint-disable-next-line no-global-assign
require = global.alias(require)
const MessageManager = require( '@/re/message-manager' )
const client = require( '@/instances/client' )

const MM = new MessageManager({
	client,
	handleEdits: true,
	handleDeletion: true,
})

module.exports = MM