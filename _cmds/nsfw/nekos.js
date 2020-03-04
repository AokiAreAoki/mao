( msg, args, cmd ) => {
    if( !args[1] || args[1] == '' ){
        httpsGet( "https://nekos.life/api/v2/endpoints", ( body ) => {
            let m = body.match( /(?:'\w+?').*(?=>)/ )[0]
            let tags = m.match( /\w+/g )
            let str = ''
            
            for( let i = 0; i < tags.length; i++ ){
                if( i != 0 ) str += ', ';
                str += tags[i]
            }

            ezembed( msg.channel, 'Tags:', str )
        }, ( err ) => {
            sendcb( msg.channel, err )
        })
    } else {
        if( !msg.channel.nsfw ){
            msg.channel.send( "This isn't an NSFW channel!" )
            return
        }
        
        httpsGet( "https://nekos.life/api/v2/img/" + args[1], ( body ) => {
            if( JSON.parse( body ).msg ){
                msg.channel.send( new ds.RichEmbed()
                    .setDescription( '**Error**: ' + JSON.parse( body ).msg )
                    .setColor( 0xFF0000 )
                )

                return
            }
            
            let url = JSON.parse( body ).url
            
            msg.channel.send( new ds.RichEmbed()
                .setDescription( `[${args[1]}](${url})` )
                .setImage( url )
                .setColor( maoclr )
                .setFooter( 'Powered by nekos.life' )
            )
        }, ( err ) => {
            sendcb( msg.channel, err )
        })
    }
}