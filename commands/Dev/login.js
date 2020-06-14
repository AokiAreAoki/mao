module.exports = {
	requirements: '_tkns waitFor bakadb',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		let tokens = _tkns.discord
		
		addCmd( 'login', 'changes account', async msg => {
			let accounts = '```Choose account:\n',
				tnums = [],
				i = 0
			
			for( let k in tokens ){
				tnums.push(k)
				accounts += `[${++i}] ${k}\n`
			}
			
			msg.delete()
			let m = await msg.send( accounts + '[0] cancel```' )
			
			waitFor({
				memberID: msg.member.id,
				timeout: 10,
				message: m,
				messageDeleteDelay: 2280,
				onMessage: async ( msg, stop ) => {
					async function login( token ){
						await m.delete()
						await msg.delete()
						await client.destroy()
						await client.login( tokens[token] )
						stop()
						
						bakadb.db.token = token
						bakadb.save()
					}
					
					if( msg.content === '0' || msg.content.toLowerCase() === 'cancel' ){
						m.edit( 'Canceled' ).then( m => m.delete( 1337 ) )
						msg.delete()
						stop()
					} else if( /\d+/.test( msg.content ) ){
						let n = Number( msg.content )
						if( n <= tnums.length )
							await login( tnums[n-1] )
					} else if( tnums.includes( msg.content.toLowerCase() ) )
						await login( msg.content.toLowerCase() )
				},
			})
		})
	}
}