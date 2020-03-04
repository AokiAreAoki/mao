( msg ) => {
    let cmds = ''
    
    for( let k in cmddata.modules.dev.cmds ){
        if( !k.match( /^\d+$/ ) ) continue;
        let cmd = cmddata.modules.dev.cmds[k]
        cmds += `${k != 0 ? '\n' : ''}• **${cmd}** - ${( cmddata.cmds[cmd].description || 'No description :c' )}`
    }
    
    if( cmds == '' ) cmds = '• **No commands :c**';
    
    let emb = new ds.RichEmbed()
        .addField( cmddata.modules.dev.printname, cmds )
        .setColor( maoclr );
    
    msg.channel.send( emb )
}