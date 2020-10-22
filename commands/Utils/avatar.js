module.exports = {
	requirements: 'embed findMem instanceOf',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		function sendAvatar( messageOrChannel, userOrMember ){
			const user = userOrMember.user || userOrMember
			
			if( !instanceOf( user, 'User' ) ) return
			if( !instanceOf( messageOrChannel, 'Message' ) && !instanceOf( messageOrChannel, 'TextChannel' ) ) return
			
			messageOrChannel.send( embed()
				.setDescription( `${user.equals( client.user ) ? 'My' : `**${user.username}**'s`} avatar` )
				.setImage( user.displayAvatarURL({ size: 2048, dynamic: true }) )
			)
		}
		
		addCmd( 'avatar', {
			short: 'displays user/server avatar',
			full: 'Usage: `avatar [@mention/username/"server"]`'
				+ "\n`avatar` - your avatar"
				+ "\n`avatar @someuser#1337` - `@someuser#1337`'s avatar"
				+ "\n`avatar server` - server icon"
		}, ( msg, args, get_string_args ) => {
			// Author's avatar
			if( !args[0] )
				return sendAvatar( msg, msg.author )
			
			// Server icon
			if( args[0].toLowerCase() === 'server' )
				return msg.send( embed()
					.setDescription( `**Server**'s icon` )
					.setImage( msg.guild.iconURL({ size: 1024, dynamic: true }) )
				)
			
			
			// Mao's avatar
			if( args[0].toLowerCase() === 'mao' )
				return sendAvatar( msg, client.user )
			
			// Exclusion: everyone/here
			if( msg.mentions.everyone )
				return msg.send( "Are You Baka?" )
			
			let memes = msg.mentions.members.array()
			
			// Search for user by name
			if( memes.length === 0 && typeof findMem === 'function' ){
				let meme = findMem( msg.guild, get_string_args() )
				
				if( meme )
					sendAvatar( msg, meme.user )
				else
					msg.send( 'User not found :c' )
				
				return
			}
			
			// Mentioned member avatar
			if( memes[0] )
				sendAvatar( msg, memes[0].user )
			else
				msg.send( "Woops... Sry, something went wrong :c" )
		})
	}
}
