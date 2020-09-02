module.exports = {
    requirements: 'tgb _tkns.telegram cb bakadb db List parseArgs',
    execute: ( requirements, dmao ) => {
        requirements.define( global )
        
        const log = console.log
        const mao = new tgb( _tkns_telegram, { polling: true } )
        dmao.tmao = mao

        if( !db.telegram ){
            db.telegram = {
                admins: new List(),
            }
        }

        // My wrapper //
        class Message {
            constructor( msg ){
                Object.assign( this, msg )
            }

            async send( text, options ){
                return await mao.sendMessage( this.chat.id, text, options )
            }

            async edit( text ){
                return await mao.editMessageText({
                    message_id: this.message_id,
                    text: text,
                })
            }
        }

        let offset = 0

        function onText( regexp, callback = () => {} ){
            mao.onText( regexp, async ( msg, match ) => {
                try {
                    let updates = await mao.getUpdates( { offset: offset + 1 } )
                    
                    updates.forEach( update => {
                        offset = update.update_id
                    })
                    
                    await mao.getUpdates( { offset: offset + 1 } )
                    
                    return callback( new Message( msg ), match )
                } catch( err ){
                    log( `"[Telegram] onText (RegExp: (${String( regexp )})) event threw error:` )
                    console.error( err )
                }
            })
        }

        function isAdmin( user ){
            return !!db.telegram.admins[user.id]
        }

        // Telegram commands
        const cmds = {
            help: {
                description: 'displays this message',
                callback: ( msg, args, get_string_args ) => {
                    let commands = 'Commands:'

                    for( let c in cmds ){
                        const cmd = cmds[c]
                        if( cmd.adminonly ) continue
                        commands += `\n• ${c} - ${cmd.description || 'no description :('}`
                    }

                    msg.send( commands )
                }
            },
            ping: {
                description: 'ping-pong',
                callback: msg => {
                    msg.send( 'Pong!' )
                    /*let start = Date.now() 

                    msg.send( 'Pinging...' ).then( msg => {
                        let ping = Date.now() - start
                        //msg.edit( `Ping: ${ping}ms` )
                        mao.editMessageText({
                            message_id: msg.message_id,
                            text: `Ping: ${ping}ms`,
                        })
                    })*/
                }
            },
            id: {
                description: "sends ur id",
                callback: ( msg, args, get_string_args ) => {
                    /*if( args[0] ){
                        log( msg.text )
                    } else*/
                        msg.send( 'ur id: ' + msg.from.id )
                }
            },
            eval: {
                adminonly: true,
                description: 'does hax',
                callback: async ( msg, args, get_string_args ) => {
                    await msg.send( 'executing...' )
                    
                    try {
                        let res = await eval( get_string_args() )
                        msg.send( String( res ) )
                    } catch( err ){
                        msg.send( String( err ) )
                    }
                }
            },
            die: {
                adminonly: true,
                description: 'kills the bot',
                callback: msg => {
                    msg.send( ':c' )
                    setTimeout( process.exit, 1337 )
                }
            },
        }

        // Sex //
        onText( /(mao|мао)([~.?!]*)/gi, ( msg, match ) => {
            let what = match[1] === 'мао' ? `что${match[2]}?` : `what${match[2]}?`
            msg.send( what )
        })

        onText( /^(-|(mao|мао)\s+)(.+)$/, ( msg, match ) => {
            let string_args = match[3]
            let cmd = string_args.matchFirst( /^\S+/i ).toLowerCase()
            string_args = string_args.substr( cmd.length ).trim()

            if( cmds[cmd] ){
                let args = [], args_pos = []
                parseArgs( string_args, args, args_pos )

                function get_string_args( number=0 ){
                    return typeof args_pos[number] === 'number' ? string_args.substring( args_pos[number] ) : ''
                }
                get_string_args.args_pos = args_pos

                if( cmds[cmd].adminonly ){
                    if( isAdmin( msg.from ) )
                        log( `${msg.from.first_name} executed admin command: ${match[3]}` )
                    else
                        return log( `${msg.from.first_name} tried to use admin command: ${match[3]}` )
                }
    
                if( cmds[cmd].callback instanceof Function )
                    cmds[cmd].callback( msg, args, get_string_args )
                else
                    log( `[Telegram] Error: ${cmd} command have no callback.` )
            }
        })
    }
}