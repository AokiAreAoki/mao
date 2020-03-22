module.exports = {
	requirements: 'cp',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		function exec( log_channel, command, delete_delay ){
			cp.exec( command, ( error, stdout, stderr ) => {
				if( error ){
					let m = log_channel.send( 'Error:' + cb( error.toString().replace( /error:\s*/i, '' ) ) )
					if( typeof delete_delay === 'number' ) m.then( m => m.delete( delete_delay * 1e3 ) )
				} else {
					let m1 = log_channel.send( 'stdout:' + ( stdout ? cb( stdout ) : '**nothing**' ) )
					let m2 = null
					
					if( stderr )
						m2 = log_channel.send( 'stderr:' + cb( stderr.replace( /error:\s*/i, '' ) ) )
					
					if( typeof delete_delay === 'number' ){
						let deleteMessage = m => m.delete( delete_delay * 1e3 )
						m1.then( deleteMessage )
						if( m2 ) m2.then( deleteMessage )
					}
				}
			})
		}
		
		addCmd( 'con', { short: 'executes console command', full: "what didn't u get?" }, ( msg, args, get_string_args ) => {
			exec( msg.channel, get_string_args() )
		})
		
		addCmd( 'cond', { short: 'executes console command and removes the message', full: "what didn't u get?" }, ( msg, args, get_string_args ) => {
			msg.delete()
			exec( msg.channel, get_string_args(), 11 )
		})
	}
}