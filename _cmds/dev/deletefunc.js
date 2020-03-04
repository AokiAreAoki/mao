( msg, args ) => {
    if( !args[1] || args[1] == '' ){
        msg.channel.send( "You didn't specify a function" )
        return
    }
    
    if( !sf[ args[1] ] ){
        msg.channel.send( "Invalid function" )
        return
    }
    
    deletefunc( args[1] )
    msg.channel.send( `Function ${args[1]} deleted` )
}