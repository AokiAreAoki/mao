( msg, args, cmd ) => {
    let s = ''
    
    for( let i = cmd.length - 1; i > args[0].length; i-- )
        s += cmd[i];
    
    if( !s ) return;
    msg.channel.send( emb()
        .addField( 'Your reversed text', s )
        .setColor( maoclr )
    )
}