( msg, args, cmd ) => {
    let color
    
    if( args[1] ){
        let hex = args[1].match( /(#|0x)?[0-9A-Fa-f]{3,6}/ )
        
        if( hex ){
            hex = hex[0].match( /[0-9A-Fa-f]{3,6}/ )[0]
            
            if( hex.length == 3 )
                hex = util.format( '%s0%s0%s0', hex[0], hex[1], hex[2] );
            
            color = parseInt( hex + 'FF', 16 )
        } else if( args[1].match( /\d+(\.\d+)?(e\d+)?/ ) && !args[2] ){
            color = Number( args[1] )
        } else {
            let nums = cmd.match( /\d+(\.\d+)?(e\d+)?/g )
            color = Number( nums[0] || 0 ) * 256 ** 3 + Number( nums[1] || 0 ) * 256 ** 2 + Number( nums[2] || 0 ) * 256 + 255 - 1
        }
    }

    if( typeof color == 'number' ){
        new jimp( 64, 64, color, ( err, img ) => {
            if( err ){
                sendcb( msg.channel, err )
                return
            }

            img.rgba( false )

            img.getBuffer( jimp.AUTO, ( err, buffer ) => {
                delete img
                let colorNoAlpha = Math.floor( ( color + 1 ) / 256 )

                if( err ) sendcb( here, err );
                else msg.channel.send( {
                    /*embed: {
                        description: 'Here is ur color',
                        color: colorNoAlpha,
                        image: buffer,
                    },*/
                    files: [buffer]
                }).catch( err => sendcb( here, err ) );
            })
        })
    } else {
        msg.channel.send( 'Invalid color specifying' )
    }
}