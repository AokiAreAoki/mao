module.exports = {
	requirements: 'client',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'ping pong',
			description: 'Checks ping',
			callback: ( msg, args ) => {
				msg.send( `P${args[-1]?.[1] === 'o' ? 'i' : 'o'}ng: \`${Math.floor( client.ws.ping )}ms\`` )
			},
		})
	}
}