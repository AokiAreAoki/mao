// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )
		const Embed = require( '@/functions/Embed' )
		const PERMS_INT = 3465304

		addCommand({
			aliases: 'invite',
			description: 'sends an invite link',
			callback: msg => msg.send( Embed().setDescription(
				`Here's your [invite link](https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=${PERMS_INT})`
			)),
		})
	}
}
