module.exports = {
	requirements: 'embed instanceOf',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		function sendAvatar( messageOrChannel, userOrMember ){
			const user = userOrMember.user || userOrMember
			
			if( !instanceOf( user, 'User' ) && !instanceOf( user, 'ClientUser' ) ) return
			if( !instanceOf( messageOrChannel, 'Message' ) && !instanceOf( messageOrChannel, 'TextChannel' ) ) return
			
			messageOrChannel.send( embed()
				.setDescription( `${user.equals( client.user ) ? 'My' : `**${user.username}**'s`} avatar` )
				.setImage( user.displayAvatarURL({ size: 2048, dynamic: true }) )
			)
		}
		
		addCmd({
			aliases: 'avatar',
			description: {
				single: `gets user's/server avatar`,
				usages: [
					['gets your avatar'],
					['server', 'gets server icon'],
					[`<@@>`, `gets $1's avatar`],
					[`<username>`, `searches for user and gets their avatar`],
				],
			},
			callback: async ( msg, args ) => {
				// Author's avatar
				if( !args[0] )
					return sendAvatar( msg, msg.author )
				
				// Server icon
				if( args[0].toLowerCase() === 'server' )
					return msg.send( embed()
						.setDescription( `Server icon` )
						.setImage( msg.guild.iconURL({ size: 1024, dynamic: true }) )
					)
				
				
				// Mao's avatar
				if( args[0].toLowerCase() === 'mao' )
					return sendAvatar( msg, client.user )
				
				// Exclusion: everyone/here
				if( msg.mentions.everyone )
					return msg.send( "Are You Baka?" )
				
				const mentionedMembers = msg.mentions.members.array()
				
				// Search for user by name
				if( mentionedMembers.length === 0 ){
					const member = await msg.guild.members.find( args.get_string() )
					
					if( member )
						sendAvatar( msg, member.user )
					else
						msg.send( 'User not found :(' )
					
					return
				}
				
				// Mentioned member avatar
				if( mentionedMembers[0] )
					sendAvatar( msg, mentionedMembers[0].user )
				else
					msg.send( "Woops... Sry, something went wrong :(" )
			},
		})
	}
}