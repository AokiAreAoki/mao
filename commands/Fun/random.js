module.exports = {
    requirements: 'client clamp',
    execute: ( requirements, mao ) => {
        requirements.define( global )

        addCmd( 'roll', 'Rolls a dice', ( msg, args ) => {
            let x = 1

            for( let i = 0; i < args.length; ++i ){
                let xx = args[i].matchFirst( /^x(\d{1,3})/i )

                if( xx ){
                    x = clamp( Number( xx ), 1, 50 )
                    args.splice( i, 1 )
                    break
                }
            }

            let min = Number( args[0] ),
                max = Number( args[1] )
            
            if( isNaN( min ) ){
                min = 0
                max = 100
            } else if( isNaN( max ) ){
                max = min
                min = 0
            }

            let nums = []

            for( let i = 0; i < x; ++i )
                nums.push( min + Math.round( Math.random() * ( max - 1 ) ) + 1 )
            
            msg.send( `**${msg.member.displayName}** rolled **${nums.join( '**, **' )}**` )
        })

        addCmd( 'select choose', 'Selects one of the given variants', ( msg, args ) => {
            if( args.length === 0 )
                return msg.send( 'Gimme something to choose, baka' )

            let r = Math.floor( Math.random() * args.length )
            msg.send( `I ${args[-1]} **${args[r]}**` )
        })

        addCmd( 'rpc', "No, this isn't Remote Procedure Call. This is Rock Paper Scissors!", ( msg, args ) => {
            let rpc = [ 'rock', 'paper', 'scissors' ],
                mao = Math.floor( Math.random() * 3 ),
                user = -1
            
            if( args[0] ){
                args[0] = args[0].toLowerCase()
                
                for( let i = 0; i < 3; i++ )
                    if( rpc[i].startsWith( args[0] ) ){
                        user = i
                        break
                    }
            }

            if( user == -1 )
                user = Math.floor( Math.random() * 3 )
            
            let result = ( mao - user + 4 ) % 3 - 1
            msg.send( `**You**: __${rpc[user]}__!\n**Mao**: __${rpc[mao]}__!` )
            msg.send( result == 0 ? 'DRAW' : ( result == 1 ? 'You lose 😭' : 'You WON! 😎' ) )
        })
    }
}
