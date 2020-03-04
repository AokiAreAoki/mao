( msg, args ) => {
    if( !args[1] ){
        msg.channel.send( "You didn't specify a function" )
        return
    }
    
    let func = eval( args[1] )
    
    if( typeof func != 'function' ){
        sendcb( msg.channel, `Error: expected function, got ${typeof func}` )
        return
    }
    
    savefunc( args[1], String( func ) )
    msg.channel.send( `Function ${args[1]} saved` )
}