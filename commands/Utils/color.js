module.exports = {
    requirements: 'vec jimp maoclr',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        function toByte( string_int ){
            let int = parseInt( string_int )
            return int < 0 ? 0 : int > 255 ? 255 : int
        }
        
        function inrange( num, min, max ){
            return min <= num && num <= max
        }
        
        let colorSystems = {
            rgb: args => vec( toByte( args[0] ), toByte( args[1] ), toByte( args[2] ) ).toHex(),
            hex: args => {
                if( args[0].length !== 6 )
                    args[0] = args[0].match( /[\da-f]{3}([\da-f]{3})?/i )[0]
                return parseInt( args[0].substring( args[0].length - 7 ), 16 )
            },
            hsl: args => {
                let h = Math.abs( Number( args[0] ) % 360 ),
                    s = /\d{1,3}%/.test( args[1] ) ? parseInt( args[1].substring( 0, args[1].length - 1 ) ) / 100 : Number( args[1] ),
                    l = /\d{1,3}%/.test( args[2] ) ? parseInt( args[2].substring( 0, args[2].length - 1 ) ) / 100 : Number( args[2] ),
                    c = ( 1 - Math.abs( 2*l - 1 ) ) * s,
                    x = c * ( 1 - Math.abs( ( h / 60 ) % 2 - 1 ) ),
                    m = l - c / 2
                
                let seg = h / 120, // segment
                    clr = vec( c, x, 0 )
                
                if( seg >= 0.5 )
                    clr.remixAxes( 'yxz' )
                if( h >= 120 )
                    clr.remixAxes( Math.floor( seg ) === 1 ? 'zxy' : 'yzx' )
                
                let result = clr.add(m).mul(255).toHex()
                delete clr
                return result
            },
            hsv: 'hsl',
            mao: () => maoclr,
        }
        
        addCmd( 'color clr', {
            short: 'displays color',
            full: "Usage: `color [type] <color>`"
            + "\nColor types:"
            + "\n• RGB: `color (0-255) (0-255) (0-255)`, `color rgb 255 0 127`"
            + "\n• HEX: `color 0x80FF00`, `color hex #Ff0000`, `color #08F`"
            + "\n• HSL/HSV: `color hsl 30 1 0.5`, `color hsl 160 50% 100%`"
            + "\n* `HSL/HSV` isn't optional! You should specify `hsl/hsv` type to use it."
        }, ( msg, args, get_string_args ) => {
            if( !args[0] )
                return msg.send( 'Usage: `-help color`' )
            
            let system = args[0].toLowerCase()

            if( colorSystems[system] )
                args.shift()
            else {
                if( /^\d{1,3}(\s+\d{1,3}){2}/.test( get_string_args() ) )
                    system = 'rgb'
                else if( /^(#|0x)[\da-f]{3,6}$/i.test( system ) )
                    system = 'hex'
                else
                    return msg.send( 'Invalid color specifying' )
            }

            if( typeof colorSystems[system] === 'string' )
                system = colorSystems[system]
            let color = colorSystems[system]( args, get_string_args() )
            
            if( typeof color == 'number' ){
                new jimp( 64, 64, color * 0x100 + 0xFF, ( err, img ) => {
                    if( err )
                        return msg.sendcb( err )

                    img.rgba( false )

                    img.getBuffer( jimp.MIME_JPEG, ( err, buffer ) => {
                        delete img
                        if( err ) msg.sendcb( err )
                        else msg.send({ files: [buffer] })
                            .catch( err => msg.sendcb( err ) )
                    })
                })
            } else
                msg.send( 'Woops... Failed to parse the color :(((' )
        })
    }
}