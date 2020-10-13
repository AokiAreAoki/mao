module.exports = {
	requirements: 'embed',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		let en = `qwertyuiop[]asdfghjkl;'zxcvbnm,./QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>?@#$^&\`~`
		let ru = `йцукенгшщзхъфывапролджэячсмитьбю.ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,"№;:?ёЁ`
		let toEN = {}, toRU = {}
		
		for( let i = 0; i < en.length; ++i ){
			toEN[ru[i]] = en[i]
			toRU[en[i]] = ru[i]
		}
		
		function translit( toENorRU, text ){
			let s = ''
				transliterate = toENorRU ? toEN : toRU
			
			for( let i = 0; i < text.length; ++i )
				s += transliterate[text[i]] || text[i]
			
			return s
		}
		
		addCmd( 'translit', {
			short: 'transliterates text (EN <=> RU)',
			full: `transliterates text (EN <=> RU)`
			+ '\nUsing: `translit <language (EN/RU)> [text or message ID]`'
			+ '\n`translit <lang>` - transliterates last message to `<lang>`'
			+ '\n`translit <lang> text` - transliterates the text to `<lang>`'
			+ '\n`translit <lang> 123456789` - transliterates the message with ID `123456789`'
		}, async ( msg, args, get_string_args ) => {
			args[0] = args[0].toLowerCase()
			if( args[0] != 'ru' && args[0] != 'en' )
				return msg.send( 'Invalid language! Use `EN` or `RU`' )
			
			if( args[1] ){
				let text = get_string_args(1)
				
				if( text.match( /^\d+$/ ) ){ // Message ID provided
					let m = await msg.channel.messages.fetch( args[1] )
		
					if( m ){
						text = translit( args[0] == 'en', m.content )
		
						if( text )
							msg.send( embed()
								.setAuthor( m.member.user.tag, m.member.user.avatarURL() )
								.setDescription( text )
							)
						else
							msg.send( 'Failed to transliterate the message.' )
					} else
						msg.send( 'Failed to fetch the message! The message doesn\'t exist, or is in another channel.' )
				} else { // Text provided
					text = translit( args[0] == 'en', text )
		
					if( text )
						msg.send( embed()
							.setAuthor( msg.member.user.tag, msg.member.user.avatarURL() )
							.setDescription( text )
						)
					else
						msg.send( 'Failed to transliterate the message.' )
				}
			} else { // Nothing provided
				let mm = await msg.channel.messages.fetch({ limit: 1, before: msg.id })
		
				if( mm.size == 0 )
					msg.send( 'Previous message not found.' )
				else {
					let m = mm.array()[0]
					let text = translit( args[1] == 'en', m.content )
		
					if( text )
						msg.send( embed()
							.setAuthor( m.member.user.tag, m.member.user.avatarURL() )
							.setDescription( text )
						)
					else
						msg.send( 'Failed to transliterate the message.' )
				}
			}
		})
	}
}