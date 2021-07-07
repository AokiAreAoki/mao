module.exports = {
	requirements: 'cp',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		function exec( channel, command, delete_delay ){
			cp.exec( command, { timeout: 15e3 }, ( error, stdout, stderr ) => {
				const deleteMessage = m => m.delete( delete_delay * 1e3 )

				if( error ){
					let m = channel.send( 'Error:' + cb( error.toString()
						.replace( /error:\s*/i, '' )
						.replace( /\u001b\[\??[\d+;]*\w/gi, '' )
					))

					if( typeof delete_delay === 'number' )
						m.then( deleteMessage )
				} else {
					stdout = stdout
						? cb( stdout.replace( /\u001b\[\??[\d+;]*\w/gi, '' ) )
						: '`nothing`'

					let m1 = channel.send( 'stdout:' + stdout ),
						m2 = stderr && channel.send( 'stderr:' + cb( stderr
							.replace( /error:\s*/i, '' )
							.replace( /\u001b\[\??[\d+;]*\w/gi, '' )
						))
					
					if( typeof delete_delay === 'number' ){
						m1.then( deleteMessage )
						if( m2 ) m2.then( deleteMessage )
					}
				}
			})
		}
		mao.exec = exec
		
		addCmd({
			aliases: 'con',
			description: {
				single: 'executes console command',
				usages: [
					['<console command...>', "executes $1. As if you'd type it in a real console."],
				],
			},
			callback: ( msg, args ) => {
				exec( msg, args.get_string() )
			},
		})
		
		addCmd({
			aliases: 'cond',
			description: {
				single: 'executes console command and removes the message',
				usages: [
					['<console command...>', "executes $1. As if you'd type it in a real console."],
				],
			},
			callback: ( msg, args ) => {
				msg.delete()
				exec( msg, args.get_string(), 11 )
			},
		})
	}
}