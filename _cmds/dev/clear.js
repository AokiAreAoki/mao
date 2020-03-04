async ( msg, args ) => {
    let cnt = Math.floor( Math.min( Number( args[1] ), 50 ) )
    
    if( isNaN( cnt ) || cnt <= 0 ){
        msg.channel.send( 'You entered invalid number or number is ≤ 0' )
        return
    }

    clear( msg.channel, cnt )
    msg.channel.send( cnt + ' message' + ( cnt > 1 ? 's have' : ' has' ) + ' been deleted' )
        .then( m => m.delete( 3e3 ) )
}