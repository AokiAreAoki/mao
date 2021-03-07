module.exports = {
	requirements: 'cmddata embed maoclr',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd( 'help h', { short: 'sends this message', full: 'nothing will help you' }, ( msg, args ) => {
			if( args[0] ){
				let k = args[0].toLowerCase()

				if( cmddata.cmds[k] ){
					if( typeof cmddata.cmds[k] == 'string' )
						k = cmddata.cmds[k]
					msg.send( cmddata.cmds[k].description.full )
				} else if( cmddata.modules[k] && ( k !== 'dev' || msg.author.isMaster() ) ){
					let module = cmddata.modules[k],
						commands = ''
					
					for( let k in module.cmds ){
						let command = module.cmds[k]
						let cmd = cmddata.cmds[command]

						if( commands ) commands += '\n'
						cmd.aliases.forEach( alias => command += '**, **' + alias )
						commands += `• **${command}** - ${cmd.description.short}`
					}
					
					msg.send( embed().addField( module.printname + ':', commands ) )
				} else
					msg.send( `Unknown command \`${k}\`.` )
				
				return
			}

			let emb = embed()
				.setDescription( `Prefix: \`${cmddata.prefix}\`\nFor more information use \`help <command>\`` )
			
			for( let k in cmddata.modules ){
				if( k == 'dev' ) continue

				let module = cmddata.modules[k],
					commands = ''
				
				for( let k in module.cmds ){
					let command = module.cmds[k]
					let cmd = cmddata.cmds[command]

					if( commands ) commands += '\n'
					cmd.aliases.forEach( alias => command += '**, **' + alias )
					commands += `• **${command}** - ` + cmd.description.short
				}

				emb.addField( module.printname + ':', commands )
			}

			msg.send( emb )
		})
	}
}