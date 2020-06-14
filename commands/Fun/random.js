module.exports = {
    requirements: 'client',
    execute: ( requirements, mao ) => {
        requirements.define( global )

        addCmd( 'roll', 'Rolls a dice', ( msg, args ) => {
            let min = Number( args[0] ),
                max = Number( args[1] )
            
            if( isNaN( min ) ){
                min = 0
                max = 100
            } else if( isNaN( max ) ){
                max = min
                min = 0
            }

            let num = min + Math.round( Math.random() * ( max - 1 ) ) + 1,
                str = `**${msg.member.displayName}** rolled a **${num}**`
            
            if( num === max ) str += '! What a lucky!'
            msg.send( str )
            msg.send( [min,max].toString() )
        })

        addCmd( 'select choose', 'Selects one of the given variants', ( msg, args ) => {
            var selected = args[ Math.floor( Math.random() * ( args.length - 1 ) ) ]
            msg.send( 'I choose **' + selected + '**' )
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
