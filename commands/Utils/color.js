module.exports = {
    requirements: 'vec jimp',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        function toByte( string_int ){
            let int = parseInt( string_int )
            return int < 0 ? 0 : int > 255 ? 255 : int
        }
        
        function inrange( num, min, max ){
            return min <= num && num <= max
        }
        
        let types = {
            rgb: args => vec( toByte( args[0] ), toByte( args[1] ), toByte( args[2] ), 255 ).toHEX(),
            hex: args => {
                if( args[0].length !== 6 )
                    args[0] = args[0].match( /[\da-f]{3}([\da-f]{3})?/i )[0]
                return parseInt( args[0].substring( args[0].length - 7 ), 16 )
            },
            hsl: args => {
                let h = Math.abs( Number( args[0] ) % 360 ),
                    s = /\d{1,3}%/.test( args[1] ) ? parseInt( args[1].substring( 0, args[1].length - 2 ) ) : Number( args[1] ),
                    l = /\d{1,3}%/.test( args[2] ) ? parseInt( args[2].substring( 0, args[2].length - 2 ) ) : Number( args[2] ),
                    c = ( 1 - Math.abs( 2*l - 1 ) ) * s,
                    x = c * ( 1 - Math.abs( ( h / 60 ) % 2 - 1 ) ),
                    m = l - c / 2
                
                let seg = h / 120, // segment
                    clr = vec( c, x, 0 )
                
                if( seg >= 0.5 )
                    clr.remixAxes( 'yxz' )
                if( h >= 120 )
                    clr.remixAxes( Math.floor( seg ) === 1 ? 'zxy' : 'yzx' )
                
                let result = clr.add(m).mul(255).toHEX() * 256 + 255
                delete clr
                return result
            },
            hsv: 'hsl',
        }
        
        addCmd( 'color clr', {
            short: 'displays color',
            full: "Usage: `color [type] <color>`"
            + "\nColor types:"
            + "\n• RGB: `color (0-255) (0-255) (0-255)`, `color rgb 255 0 127`"
            + "\n• HEX: `color 0x80FF00`, `color hex #Ff0000`, `color #08F`"
            + "\n• HSL/HSV: `color hsl 30 1 0.5`, `color hsl 160 50% 100%"
            + "\n* `HSL/HSV` isn't optional! You should specify `hsl/hsv` type to use it."
        }, ( msg, args, get_string_args ) => {
            let arg = args[0].toLowerCase(),
                type = types[arg]

            if( type )
                args.shift()
            else {
                if( /^\d{1,3}(\s+\d{1,3}){2}/.test( get_string_args() ) )
                    type = 'rgb'
                else if( /^(#|0x)[\da-f]{3,6}$/i.test( arg ) )
                    type = 'hex'
                else
                    return msg.channel.send( 'Invalid color specifying' )
            }

            if( typeof types[type] === 'string' )
                type = types[type]
            let color = types[type]( args, get_string_args() )
            
            if( typeof color == 'number' ){
                new jimp( 64, 64, color, ( err, img ) => {
                    if( err )
                        return msg.channel.sendcb( err )

                    img.getBuffer( jimp.AUTO, ( err, buffer ) => {
                        delete img
                        if( err ) msg.channel.sendcb( err )
                        else msg.channel.send({ files: [buffer] })
                            .catch( err => msg.channel.sendcb( err ) )
                    })
                })
            } else
                msg.channel.send( 'Woops... Failed to parse the color :(((' )
        })
    }
}