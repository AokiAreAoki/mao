module.exports = {
    requirements: 'client',
    execute: ( requirements, mao ) => {
        requirements.define( global )

        addCmd( 'roll', 'Rolls a dice', msg => {
            let num = Math.round( Math.random() * 99 ) + 1;
            let str = `**${msg.member.displayName}** rolled a **${num}**`
            if( num == 100 ) str += '! My congratulations~!';
            msg.channel.send( str );
        })

        addCmd( 'select choose', 'Selects one of the given variants', ( msg, args ) => {
            var selected = args[ Math.floor( Math.random() * ( args.length - 1 ) ) ];
            msg.channel.send( 'I choose **' + selected + '**' );
        })

        addCmd( 'rpc', "No, this isn't Remote Procedure Call. This is Rock Paper Scissors!", ( msg, args ) => {
            let rpc = [ 'rock', 'paper', 'scissors' ],
                mao = Math.floor( Math.random() * 3 ),
                user = -1;
            
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
            msg.channel.send( `**You**: __${rpc[user]}__!\n**Mao**: __${rpc[mao]}__!` )
            msg.channel.send( result == 0 ? 'DRAW' : ( result == 1 ? 'You lose 😭' : 'You WON! 😎' ) )
        })
    }
}
