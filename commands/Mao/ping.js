// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )

		addCommand({
			aliases: 'ping pong',
			description: 'Checks ping',
			callback: ( msg, args ) => {
				msg.send( `P${args[-1]?.[1] === 'o' ? 'i' : 'o'}ng: \`${Math.floor( client.ws.ping )}ms\`` )
			},
		})
	}
}