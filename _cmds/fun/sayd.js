( msg, args, cmd ) => {
    if( !args[1] ) return msg.channel.send( 'Gimme text! ' + client.emojis.get( '574361160455815172' ).toString() );
    let txt = cmd.substring( args[0].length + 1 )
    if( !msg.member.hasPermission( ds.Permissions.FLAGS.EMBED_LINKS ) )
        txt = txt.replace( /(https?:\/\/[\w/#%@&$?=+.,:;]+)/, '<$1>' );
    msg.channel.send( `**${msg.member.user.tag}**: ` + txt.replace( /baka/gi, words.baka ) )
    msg.delete()
}