module.exports = {
    requirements: 'cmddata embed maoclr',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        addCmd( 'help h', { short: 'Sends this message', full: 'nothing will help you' }, ( msg, args ) => {
            if( args[0] ){
                let cmd = args[0]

                if( cmddata.cmds[cmd] ){
                    if( typeof cmddata.cmds[cmd] == 'string' )
                        cmd = cmddata.cmds[cmd]
                    msg.channel.send( cmddata.cmds[cmd].description.full )
                } else
                    msg.channel.send( `Unknown command \`${cmd}\`` )
                
                return
            }

            let emb = embed().setDescription( `Prefix: \`${cmddata.prefix}\`\nFor more information use \`help <command>\`` )
            
            for( let k in cmddata.modules ){
                let module = cmddata.modules[k],
                    commands = ''
                
                if( k == 'dev' && !msg.author.isMaster() ) continue

                for( let k in module.cmds ){
                    let command = module.cmds[k]
                    let cmd = cmddata.cmds[command]

                    if( commands ) commands += '\n'
                    cmd.aliases.forEach( alias => command += '**, **' + alias )
                    commands += `• **${command}** - ` + cmd.description.short
                }

                emb.addField( module.printname + ':', commands )
            }

            emb.setColor( maoclr )
            msg.channel.send( emb )
        })
    }
}