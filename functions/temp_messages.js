module.exports = {
	requirements: 'client embed bakadb db waitFor addMessageHandler',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		const max_tms = 5
		const max_lifetime = 86400
		const time_units = ['day', 'hour', 'minute', 'second']
		const ss = num => num === 1 ? '' : 's'
		
		setInterval( async () => {
			if( !db.temp_messages )
				db.temp_messages = {}
			
			let now = Date.now()
			
			for( let messageid in db.temp_messages ){
				let data = db.temp_messages[messageid]
				if( data.timestamp > now ) continue
				
				let channel = client.channels.cache.get( data.channel )
				if( !channel ) conti
					
				channel.messages.fetch( messageid )
					.then( async m => {
						await m.delete()
						delete db.temp_messages[messageid]
				    })
				    .catch( err => {
				        delete db.temp_messages[messageid]
				    })
			}
		}, 5e3 )
		
		addMessageHandler( async msg => {
			if( msg.author.id == client.user.id || msg.author.bot )
				return
			
			if( /[\s\n]\/temp$/i.test( msg.content ) ){
				let tms = 0
				
				for( let k in db.temp_messages )
				    if( db.temp_messages[k].userid == msg.author.id )
				        if( ++tms >= max_tms )
				            return msg.send( "You've reached the limit of temporary messages" )
				
				let message = await msg.send( embed()
					.setAuthor( '@' + msg.author.tag, msg.author.avatarURL() )
					.setDescription( 'Provide the time your message will be deleted in' )
					.setFooter( 'Timeout: 60s' )
				)
				
				waitFor({
					memberID: msg.author.id,
					onMessage: ( msg2, stop ) => {
						let match = msg2.content.match( /((\d+)d)?\s*((\d+)h)?\s*((\d+)m)?\s*((\d+)s)?/i )
						if( match == null ) return
						
						let d = match[2] ? Number( match[2] ) : 0
						let h = match[4] ? Number( match[4] ) : 0
						let m = match[6] ? Number( match[6] ) : 0
						let s = match[8] ? Number( match[8] ) : 0
					
						let lifetime = d * 86400 + h * 3600 + m * 60 + s
						if( lifetime === 0 ) return
						
						lifetime = Math.min( lifetime, max_lifetime )
						
						db.temp_messages[msg.id] = {
							userid: msg.author.id,
							channel: msg.channel.id,
							timestamp: Date.now() + lifetime * 1000,
						}
						bakadb.save()
						
						let timeleft = []
						d = Math.floor( lifetime / 86400 )
						h = Math.floor( lifetime / 3600 % 24 )
						m = Math.floor( lifetime / 60 % 60 )
						s = lifetime % 60;
						
						[d,h,m,s].forEach( ( v, i ) => {
						    if( v > 0 ) timeleft.push( v + ' ' + time_units[i] + ss(v) )
						})
						
						message.edit( embed()
							.setAuthor( '@' + msg.author.tag, msg.author.avatarURL() )
							.setDescription( 'Your message will be deleted in ' + timeleft.join( ' ' ) )
						).then( m => {
							m.delete( 4e3 )
							msg2.delete( 4e3 )
						})
						
						stop()
					},
					timeout: 60,
					message: message,
				})
			}
		})
	}
}