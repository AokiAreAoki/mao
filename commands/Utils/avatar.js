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
			    msg.channel.send( embed()
            		.setDescription( `**${msg.member.displayName}**'s avatar` )
            	   	.setImage( msg.author.avatarURL({ size: 2048 }) )
            	)
			else {
			    // Server icon
			    if( args[0].toLowerCase() == 'server' ){
            		let url = `https://cdn.discordapp.com/icons/${msg.guild.id}/${msg.guild.icon}.jpg?size=1024`
            		
            		return msg.channel.send( embed()
            			.setDescription( `**Server**'s icon` )
            			.setImage( url )
            		)
    			}
			    
        		// Exclusion: everyone
        		if( msg.mentions.everyone )
            		return msg.channel.send( "Are You Baka?" )
        		
			    let memes = msg.mentions.members.array()
    			
        		if( memes.length == 0 && typeof findMem == 'function' ){
            		let meme = findMem( msg.guild, get_string_args() )
            		
            		if( meme )
                		msg.channel.send( embed()
                    		.setDescription( ( meme.user.equals( client.user ) ? 'My' : `**${meme.displayName}**'s` ) + ' avatar' )
                    		.setImage( meme.user.avatarURL({ size: 2048 }) )
                		)
            		else
                		msg.channel.send( 'User not found :c' )
            		
            		return
        		}
        		
        		// Mentioned member avatar
        		let meme = memes[0]
        		if( meme ){
            		msg.channel.send( embed()
            		    .setDescription( ( meme.user.equals( client.user ) ? 'My' : `**${meme.displayName}**'s` ) + ' avatar' )
            		    .setImage( meme.user.avatarURL({ size: 2048 }) )
            		)
        		} else
            		msg.channel.send( "Woops... Sry, something went wrong :c" )
			}
		})
    }
}