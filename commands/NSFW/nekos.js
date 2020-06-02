module.exports = {
	requirements: 'httpGet embed',
	execute: ( requirements, mao ) => {
        requirements.define( global )
        
        addCmd( 'nekos', 'hot girls', ( msg, args ) => {
            if( args[0] ){
                if( !msg.channel.nsfw && ( !/-+force/i.test( args[1] ) || !msg.author.isMaster() ) )
                    return msg.channel.send( "This isn't an NSFW channel!" )
                
                httpGet( "https://nekos.life/api/v2/img/" + args[0].toLowerCase(), body => {
                    body = JSON.parse( body )

                    if( body.msg ){
                        msg.send( embed()
                            .setDescription( '**Error**: ' + body.msg )
                            .setColor( 0xFF0000 )
                        )
                    } else {
                        msg.send( embed()
                            .setDescription( `[${args[0]}](${body.url})` )
                            .setImage( body.url )
                            .setFooter( 'Powered by nekos.life' )
                        )
                    }
                }, msg.sendcb )
            } else {
                httpGet( "https://nekos.life/api/v2/endpoints", body => {
                    let m = body.match( /(?:'\w+?').*(?=>)/ )[0]

                    msg.send( embed()
                        .addField( 'Tags:', m.match( /\w+/g ).join( ', ' ) )
                        .setFooter( 'Powered by nekos.life' )
                    )
                }, msg.sendcb )
            }
        })
    }
}