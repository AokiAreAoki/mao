module.exports = {
    requirements: 'client waitFor',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        addCmd( 'sendemoji emoji e', 'Sends random emoji that matches the keyword', async ( msg, args ) => {
            let emojis = client.emojis.cache.array()
            let all = args[1] && /-+all/i.test( args[1].toLowerCase() )

            if( args[0] ){
                args[0] = args[0].toLowerCase()
                emojis = emojis.filter( e => e.name.toLowerCase().search( args[0] ) !== -1 )
            }
            
            if( emojis.length > 0 ){
                if( all )
                    msg.send( emojis.join( ' ' ) )
                else {
                    let r = Math.floor( Math.random() * emojis.length )
                    msg.send( emojis[r].toString() )
                    
                    /* doesn't work idk why
                    let text = ''
                    emojis.forEach( ( e, k ) => text += `[${k + 1}] • ${e.toString()}\n` )
                    let message = await msg.send( text )

                    waitFor( msg.member.id, 60, {
                        onMessage: ( msg, stopWaiting ) => {
                            console.log( msg.author.username, '::', msg.content )

                            if( /^\d+$/.test( msg.content ) ){
                                let n = Number( msg.content )
                                
                                if( 0 < n && n <= emojis.length ){
                                    stopWaiting()
                                    msg.send( emojis[n - 1] )
                                    message.delete()
                                }

                                msg.delete()
                            }
                        },
                        onTimeout: stopWaiting => msg.edit( 'Timed out' ).then( m => m.delete( 1337 * 2 ) ),
                        onOverwrite: stopWaiting => msg.edit( 'Canceled' ).then( m => m.delete( 1337 * 2 ) ),
                    })
                    //*/
                }
            } else
                msg.send( `Emoji${all ? 's' : ''} not found :(` )
        })
    }
}