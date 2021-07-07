module.exports = {
	requirements: 'client',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'sendemoji emoji e',
			description: 'Sends random emoji that matches the keyword',
			callback: async ( msg, args ) => {
				let emojis = client.emojis.cache.array()
				let all = args[1] && /-+all/i.test( args[1].toLowerCase() )

				if( args[0] ){
					args[0] = args[0].toLowerCase()
					emojis = emojis.filter( e => e.name.toLowerCase().search( args[0] ) !== -1 )
				}
				
				if( emojis.length > 0 ){
					if( all )
						msg.send( emojis.join( ' ' ) )
					else {
						//let r = Math.floor( Math.random() * emojis.length )
						//msg.send( emojis[r].toString() )
						
						//* doesn't work idk why
						let text = ''
						emojis.forEach( ( e, k ) => text += `[${k + 1}] • ${e.toString()}\n` )
						const displayMessage = await msg.send( text )

						msg.awaitResponse({ displayMessage, timeout: 60 })
							.if( msg => /^\d+$/.test( msg.content ) )
							.then( ( message, waiter ) => {
								const number = Number( message.content )
								
								if( 0 < number && number <= emojis.length ){
									waiter.stop()
									msg.send( emojis[number - 1].toString() )
									msg.delete()
								}

								message.delete()
							})
					}
				} else
					msg.send( `Emoji${all ? 's' : ''} not found :(` )
			},
		})
	}
}