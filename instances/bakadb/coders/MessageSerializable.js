// eslint-disable-next-line no-global-assign
require = global.alias(require)

module.exports = /**
* @param {import("@/libs/bakadb")} bakadb
*/
function( bakadb ){
	const MessageSerializable = require( '@/libs/MessageSerializable' )
	const client = require( '@/instances/client' )

	MessageSerializable.setClient( client )

	/** @param {MessageSerializable} ms */
	const serialize = ms => `MessageSerializable:${ms.channelId}/${ms.id}`

	/** @param {string} data */
	const deserialize = data => {
		const [channelId, id] = data.split( '/' )
		return new MessageSerializable({ channelId, id })
	}

	bakadb.createCoder( MessageSerializable, serialize, deserialize )
}