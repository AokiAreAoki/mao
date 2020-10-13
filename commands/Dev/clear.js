module.exports = {
	requirements: 'client',
	execute: ( requirements, mao ) => {
		requirements.define( global )

		addCmd( 'clear clean purge', { short: 'Removes messages', full: 'Usage: `clear <number messages (max 50)>`' }, async ( msg, args ) => {
			let cnt = args[0] ? Math.floor( Math.min( Number( args[0] ), 50 ) ) : 1
			
			if( isNaN( cnt ) || cnt <= 0 ){
				msg.send( 'You entered invalid number or number is ≤ 0' )
				return
			}
			
			if( client.user.bot )
				msg.channel.bulkDelete( cnt + 1 )
			else
				msg.channel.fetchMessages({ limit: cnt + 1 })
					.then( mm => mm.array().forEach( m => m.delete() ) )

			msg.send( cnt + ' message' + ( cnt > 1 ? 's have' : ' has' ) + ' been deleted' )
				.then( m => m.delete( 3e3 ) )
		})
	}
}