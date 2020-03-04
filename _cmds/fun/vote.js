( msg, args, cmd ) => {
    vote( msg.channel, cmd.substring( args[0].length + 1 ) )
}