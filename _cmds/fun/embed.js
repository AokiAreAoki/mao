( msg, args, cmd ) => {
    if( args[1] )
        msg.channel.send( emb()
            .setColor( maoclr )
            .setAuthor( msg.member.user.tag, msg.member.user.avatarURL )
            .setDescription( cmd.substring( args[0].length + 1 ) ) )
    else
        msg.channel.send( emb()
            .setColor( maoclr )
            .setAuthor( client.user.tag, client.user.avatarURL )
            .setDescription( 'Gimme text! <:baka:574361160455815172>' ) )
}