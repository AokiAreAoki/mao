module.exports = {
	requirements: 'client',
	init: ( requirements, mao ) => {
		requirements.define( global )

		const MAX = 50

		addCmd({
			aliases: 'clear clean purge',
			description: {
				single: 'removes messages',
				usages: [
					[`<number>`, `removes $1 of last messages (max. ${MAX})`],
				]
			},
			callback: async ( msg, args ) => {
				let cnt = args[0] ? Math.floor( Math.min( Number( args[0] ), MAX ) ) : 1
				
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
			},
		})
	}
}