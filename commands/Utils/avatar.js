module.exports = {
	requirements: 'embed findMem',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd( 'avatar', {
			short: 'displays user/server avatar',
			full: 'Usage: `avatar [@mention/username/"server"]`'
				+ "\n`avatar` - your avatar"
				+ "\n`avatar @someuser#1337` - `@someuser#1337`'s avatar"
				+ "\n`avatar server` - server icon"
		}, ( msg, args, get_string_args ) => {
			if( !args[0] )
				// My avatar
				msg.send( embed()
					.setDescription( `**${msg.member.displayName}**'s avatar` )
				   	.setImage( msg.author.avatarURL({ size: 2048, dynamic: true }) )
				)
			else {
				// Server icon
				if( args[0].toLowerCase() == 'server' )
					return msg.send( embed()
						.setDescription( `**Server**'s icon` )
						.setImage( msg.guild.iconURL({ size: 1024, dynamic: true }) )
					)
				
				// Exclusion: everyone
				if( msg.mentions.everyone )
					return msg.send( "Are You Baka?" )
				
				let memes = msg.mentions.members.array()
				
				if( memes.length == 0 && typeof findMem == 'function' ){
					let meme = findMem( msg.guild, get_string_args() )
					
					if( meme )
						msg.send( embed()
							.setDescription( ( meme.user.equals( client.user ) ? 'My' : `**${meme.displayName}**'s` ) + ' avatar' )
							.setImage( meme.user.avatarURL({ size: 2048, dynamic: true }) )
						)
					else
						msg.send( 'User not found :c' )
					
					return
				}
				
				// Mentioned member avatar
				let meme = memes[0]
				if( meme ){
					msg.send( embed()
						.setDescription( ( meme.user.equals( client.user ) ? 'My' : `**${meme.displayName}**'s` ) + ' avatar' )
						.setImage( meme.user.avatarURL({ size: 2048, dynamic: true }) )
					)
				} else
					msg.send( "Woops... Sry, something went wrong :c" )
			}
		})
	}
}
