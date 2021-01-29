module.exports = {
	requirements: 'cp',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		function exec( channel, command, delete_delay ){
			cp.exec( command, { timeout: 5e3 }, ( error, stdout, stderr ) => {
				if( error ){
					let m = channel.send( 'Error:' + cb( error.toString().replace( /error:\s*/i, '' ) ) )
					if( typeof delete_delay === 'number' ) m.then( m => m.delete( delete_delay * 1e3 ) )
				} else {
					let m1 = channel.send( 'stdout:' + ( stdout ? cb( stdout ) : '**nothing**' ) )
					let m2 = null
					
					if( stderr )
						m2 = channel.send( 'stderr:' + cb( stderr.replace( /error:\s*/i, '' ) ) )
					
					if( typeof delete_delay === 'number' ){
						let deleteMessage = m => m.delete( delete_delay * 1e3 )
						m1.then( deleteMessage )
						if( m2 ) m2.then( deleteMessage )
					}
				}
			})
		}
		
		addCmd( 'con', { short: 'executes console command', full: "what didn't u get?" }, ( msg, args, get_string_args ) => {
			exec( msg, get_string_args() )
		})
		
		addCmd( 'cond', { short: 'executes console command and removes the message', full: "what didn't u get?" }, ( msg, args, get_string_args ) => {
			msg.delete()
			exec( msg, get_string_args(), 11 )
		})
	}
}