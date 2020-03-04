async ( msg, args, cmd ) => {
	args[1] = args[1].toLowerCase()
	if( args[1] != 'ru' && args[1] != 'en' )
		return msg.channel.send( 'Invalid language! Use `EN` or `RU`' )
	
	if( args[2] ){
		let text = cmd.substring( cmd.match( RegExp( `^${ args[0] }\\s+${ args[1] }\\s+` ) )[0].length )
		
		if( text.match( /^\d+$/ ) ){
			let m = await msg.channel.fetchMessage( args[2] )

			if( m ){
				text = translit( args[1] == 'en', m.content )

				if( text )
					msg.channel.send( emb()
						.setColor( maoclr )
						.setAuthor( m.member.user.tag, m.member.user.avatarURL )
						.setDescription( text )
					)
				else
					msg.channel.send( 'Failed to transliterate the message.' )
			} else
				msg.channel.send( 'Failed to fetch the message! The message doesn\'t exist, or is in another channel.' )
		} else {
			text = translit( args[1] == 'en', text )

			if( text )
				msg.channel.send( emb()
					.setColor( maoclr )
					.setAuthor( msg.member.user.tag, msg.member.user.avatarURL )
					.setDescription( text )
				)
			else
				msg.channel.send( 'Failed to transliterate the message.' )
		}
	} else {
		let mm = await msg.channel.fetchMessages({ limit: 1, before: msg.id })

		if( mm.size == 0 )
			msg.channel.send( 'Previous message not found.' )
		else {
			let m = mm.array()[0]
			let text = translit( args[1] == 'en', m.content )

			if( text )
				msg.channel.send( emb()
					.setColor( maoclr )
					.setAuthor( m.member.user.tag, m.member.user.avatarURL )
					.setDescription( text )
				)
			else
				msg.channel.send( 'Failed to transliterate the message.' )
		}
	}
}