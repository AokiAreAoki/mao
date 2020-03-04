( msg, args ) => {
    var act = args[1];
    
    if( m[act] ){
        m[act]( msg, args );
    } else {
        msg.channel.send( 'Wrong action.' );
    };
}