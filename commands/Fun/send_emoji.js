module.exports = {
    requirements: 'client',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        addCmd( 'sendemoji emoji e', 'Sends random emoji that matches the keyword', ( msg, args ) => {
            let emojis = client.emojis.cache
            let all = args[1] && /-+all/i.test( args[1].toLowerCase() )

            if( args[0] ){
                args[0] = args[0].toLowerCase()
                emojis = emojis.filter( e => e.name.toLowerCase().search( args[0] ) !== -1 )
            }
            
            if( emojis.size > 0 ){
                if( all )
                    msg.send( emojis.array().join( ' ' ) )
                else
                    msg.send( emojis.random().toString() )
            } else
                msg.send( `Emoji${all ? 's' : ''} not found :(` )
        })
    }
}