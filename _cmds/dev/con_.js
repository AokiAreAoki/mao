( msg, args, cmd ) => {
    cp.exec( cmd.substring( args[0].length + 1 ) )
}