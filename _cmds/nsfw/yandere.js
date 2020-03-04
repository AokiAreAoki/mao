async ( msg, args, cmd ) => {
    let tags = cmd.substring( args[0].length + 1 ).toLowerCase()
    let safe = false
    let tags_array = tags.match( /\S+/g )

    if( tags_array ){
        for( let k in tags_array ){
            if( tags_array[k] == '/safe' ){
                safe = true
                tags = tags.replace( /\/safe/g, 's' )
                break
            }

            if( tags_array[k] == 's' ){
                safe = true
                break
            }
        }
    }
    
    if( !safe && !msg.channel.nsfw )
        return msg.channel.send( 'This isn\'t an NSFW channel!' );
    
    let message = await msg.channel.send( getRandomLoadingPhrase() )

    httpsGet( 'https://yande.re/post.json?page=1&limit=100&tags=' + tags, body => {
        body = JSON.parse( body )
        
        if( body.length == 0 ){
            message.edit( new ds.RichEmbed()
                .setDescription( `Tag(s) \`${tags}\` not found :c` )
                .setColor( 0xFF0000 )
            )
            return
        }
        
        let timeout = curtime() + 1
        let r = Math.floor( Math.random() * body.length )
        while( !body[r] && timeout > curtime() ) 
            r = Math.floor( Math.random() * body.length );
        
        if( !tags.match( /\S/ ) ) tags = 'no tags';
        
        let emb = new ds.RichEmbed()
            .setDescription( `[${tags}](${body[r].sample_url})` )
            .setImage( body[r].jpeg_url )
            .setColor( maoclr )
            .setFooter( 'Powered by yande.re' )
        
        message.edit( emb )
    }, err => message.edit( cb( err ) ) )
}