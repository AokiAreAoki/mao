module.exports = {
	requirements: 'client cp',
	init: ( requirements, mao ) => {
		requirements.define( global )

		function callback( msg, args ){
			const string_command = args.get_string()

			if( !string_command )
				return this.sendHelp( msg )

			const loading = String( client.emojis.resolve( '822881934484832267' ) ?? 'Executing...' )
			const promise = msg.send( loading )

			let finished = false
			let terminated = false
			let timeout

			const command = cp.spawn( args.shift(), args, {
				timeout: 60e3,
				detached: true,
			})
			
			let stdout = '', stderr = ''
			command.stdout.on( 'data', chunk => stdout += chunk )
			command.stderr.on( 'data', chunk => stderr += chunk )
			
			command.once( 'error', error => {
				if( terminated )
					return

				finished = true
				clearTimeout( timeout )
				
				promise.then( m => m.edit( 'Error:' + cb( error.toString()
					.replace( /error:\s*/i, '' )
					.replace( /\u001b\[\??[\d+;]*\w/gi, '' )
				)))
			})

			command.once( 'exit', async error => {
				if( terminated )
					return

				finished = true
				clearTimeout( timeout )
				let message = await promise

				if( message.deleted ){
					message = await message.send( `\`${args.get_string()}\` finished execution.` )
					await new Promise( resolve => setTimeout( resolve, 3e3 ) )
					message.delete( 8e3 )
					msg = message
				}

				if( error )
					return message.edit( 'Error:' + cb( error.toString()
						.replace( /error:\s*/i, '' )
						.replace( /\u001b\[\??[\d+;]*\w/gi, '' )
					))

				message.edit( 'stdout:' + ( stdout
					? cb( stdout.replace( /\u001b\[\??[\d+;]*\w/gi, '' ) )
					: '`nothing`'
				))

				if( stderr )
					msg.send( 'stderr:' + cb( stderr
						.replace( /error:\s*/i, '' )
						.replace( /\u001b\[\??[\d+;]*\w/gi, '' )
					))
			})

			promise.then( message => {
				if( finished )
					return

				let nextMessageUpdate = Date.now() + 5e3

				function updateOutput(){
					if( finished )
						return
					
					if( message.deleted ){
						terminated = true
						command.kill( 'SIGINT' )
						message.send( `\`${string_command}\` has been terminated.` )
							.then( m => m.purge( 3e3 ) )
						return
					}
					
					timeout = setTimeout( updateOutput, 100 )

					if( nextMessageUpdate < Date.now() ){
						nextMessageUpdate = Date.now() + 5e3
						
						message.edit( loading + ( stdout.trim()
							? '\n' + cb( stdout.replace( /\u001b\[\??[\d+;]*\w/gi, '' ) )
							: ''
						))
					}
				}
				updateOutput()
			})
		}

		addCmd({
			aliases: 'con',
			description: {
				single: 'executes console command',
				usages: [
					['<console command...>', "executes $1. As if you'd type it in a real console."],
				],
			},
			callback,
		})
	}
}