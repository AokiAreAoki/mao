module.exports = {
	requirements: 'Embed',
	init: ( requirements, mao ) => {
		requirements.define( global )

		const PERMS_INT = 3465304

		addCmd({
			aliases: 'invite',
			description: 'sends an invite link',
			callback: msg => msg.send( Embed().setDescription(
				`Here's your [invite link](https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=${PERMS_INT})`
			)),
		})
	}
}
