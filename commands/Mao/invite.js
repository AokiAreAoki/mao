module.exports = {
	requirements: 'Embed',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		const invite_types = {
			max: { name: 'Full', int: 8 },
			min: { name: 'Minimal', int: 3465296 },
		}

		addCmd({
			aliases: 'invite',
			description: {
				single: 'sends the invite link',
				usages: [
					['sends list of all invite types'],
					['<invite type>', 'sends invite of $1 type'],
				],
			},
			callback: ( msg, args ) => {
				if( !args[0] ){
					let types = ''
					
					for( let k in invite_types )
						types += `\n• \`${k}\` - ${invite_types[k].name} permissions invite (integer: ${invite_types[k].int})`
					
					if( !types )
						return msg.send( `Weird... I have no data about invite types` )
					
					msg.send( 'Invite types:' + types )
				}
				
				const perm = invite_types[args[0].toLowerCase()]
					
				if( perm )
					msg.send( Embed().addField(
						perm.name + ' permissions invite',
						`Here's your [invite link](https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=${perm.int})`
					))
			},
		})
	}
}