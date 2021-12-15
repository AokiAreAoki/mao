module.exports = {
	requirements: '_tkns bakadb',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'login',
			description: 'changes account',
			callback: async msg => {
				let accounts = '```Choose account:\n'
				let tokens = []
				
				for( const k in _tkns.discord ){
					tokens.push(k)
					accounts += `[${tokens.length}] ${k}\n`
				}
				
				const displayMessage = await msg.send( accounts + '[0] cancel```' )
				
				msg.awaitResponse({ displayMessage, timeout: 10 })
					.if( msg => /^(cancel|\d+)$/i.test( msg.content ) )
					.then( async ( message, waiter ) => {
						if( message.content.toLowerCase() === 'cancel' )
							waiter.cancel()

						const number = parseInt( message.content )

						if( number <= tokens.length ){
							waiter.stop()
							await Promise.all([
								message.delete(),
								msg.delete(),
							])

							const token = tokens[number - 1]
							await client.destroy()
							await client.login( tokens[token] )
							
							bakadb.db.token = token
							bakadb.save()
						}
					})
			},
		})
	}
}