( msg, args, cmd ) => {
    let ment = msg.mentions
    let memes = ment.members.array()
    
    // Server icon
    if( args[1] && args[1].toLowerCase() == 'server' ){
        let url = `https://cdn.discordapp.com/icons/${msg.guild.id}/${msg.guild.icon}.jpg?size=1024`
        
        let emb = new ds.RichEmbed()
            .setDescription( `**Server**'s icon` )
            .setImage( url )
            .setColor( maoclr )
        msg.channel.send( emb )
        return
    }

    if( memes.length == 0 ){
        // Try to find a member
        if( args[1] && typeof findMem == 'function' ){
            let meme = findMem( msg.guild, cmd.substring( args[0].length + 1 ) )
            if( meme ){
                let emb = new ds.RichEmbed()
                    .setDescription( ( meme.user.equals( client.user ) ? 'My' : `**${meme.displayName}**'s` ) + ' avatar' )
                    .setImage( meme.user.avatarURL )
                    .setColor( maoclr )
                msg.channel.send( emb )
            } else
                msg.channel.send( 'User not found :c' )

            return
        }

        // My avatar
        let emb = new ds.RichEmbed()
            .setDescription( `**${msg.member.displayName}**'s avatar` )
            .setImage( msg.author.avatarURL )
            .setColor( maoclr )
        
        msg.channel.send( emb )
        return
    }

    // Exclusion: everyone
    if( ment.everyone ){
        msg.channel.send( "Are You Baka?" )
        return
    }
    
    // Mentioned member avatar
    let meme = memes[0]
    if( meme ){
        let emb = new ds.RichEmbed()
            .setDescription( ( meme.user.equals( client.user ) ? 'My' : `**${meme.displayName}**'s` ) + ' avatar' )
            .setImage( meme.user.avatarURL )
            .setColor( maoclr )
        msg.channel.send( emb )
    } else
        msg.channel.send( "Woops... Sry, something went wrong :c" )
}