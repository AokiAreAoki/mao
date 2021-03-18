module.exports = {
	requirements: 'cp',
	init: ( requirements, mao ) => {
		requirements.define( global )
		const deleteMessage = m => m.delete( delete_delay * 1e3 )
		
		function exec( channel, command, delete_delay ){
			cp.exec( command, { timeout: 15e3 }, ( error, stdout, stderr ) => {
				if( error ){
					let m = channel.send( 'Error:' + cb( error.toString()
						.replace( /error:\s*/i, '' )
						.replace( /\u001b\[\??[\d+;]*\w/gi, '' )
					))

					if( typeof delete_delay === 'number' )
						m.then( m => m.delete( delete_delay * 1e3 ) )
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
						m2?.then( deleteMessage )
					}
				}
			})
		}
		mao.exec = exec
		
		addCmd( 'con', { short: 'executes console command', full: "what didn't u get?" }, ( msg, args, get_string_args ) => {
			exec( msg, get_string_args() )
		})
		
		addCmd( 'cond', { short: 'executes console command and removes the message', full: "what didn't u get?" }, ( msg, args, get_string_args ) => {
			msg.delete()
			exec( msg, get_string_args(), 11 )
		})
	}
}