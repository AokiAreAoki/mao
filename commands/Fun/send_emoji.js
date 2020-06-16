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
                    //let r = Math.floor( Math.random() * emojis.length )
                    //msg.send( emojis[r].toString() )
                    
                    //* doesn't work idk why
                    let text = ''
                    emojis.forEach( ( e, k ) => text += `[${k + 1}] • ${e.toString()}\n` )
                    let message = await msg.send( text )

                    waitFor({
                        memberID: msg.member.id,
                        timeout: 60,
                        message: message,
                        messageDeleteDelay: 1337 * 2,
                        onMessage: ( msg, stopWaiting ) => {
                            if( /^\d+$/.test( msg.content ) ){
                                let n = Number( msg.content )
                                
                                if( 0 < n && n <= emojis.length ){
                                    stopWaiting()
                                    msg.send( emojis[n - 1].toString() )
                                    msg.delete()
                                    message.delete()
                                    return true
                                }

                                msg.delete()
                            }

                            return false
                        },
                    })
                    //*/
                }
            } else
                msg.send( `Emoji${all ? 's' : ''} not found :(` )
        })
    }
}