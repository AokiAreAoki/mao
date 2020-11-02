module.exports = {
	requirements: 'embed',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		const invite_types = {
			max: { name: 'Full', int: 8 },
			min: { name: 'Minimal', int: 3465296 },
		}
		
		let types = ''
		
		for( let k in invite_types )
			types += `\n• \`${k}\` - ${invite_types[k].name} permissions invite (integer: ${invite_types[k].int})`
		
		if( !types )
			types = '\n\twait there\'s no types wtf'
		
		addCmd( 'invite', {
			short: 'Sends the invite link',
			full: ''
		}, ( msg, args ) => {
			if( args[0] ){
				let perm = invite_types[args[0].toLowerCase()]
				
				if( perm )
					return msg.send( embed().addField(
						perm.name + ' permissions invite',
						`Here's your [invite link](https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=${perm.int})`
					))
			}
			
			msg.send( 'Invite types:' + types )
		})
	}
}