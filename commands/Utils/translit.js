module.exports = {
	requirements: 'Embed',
	init: ( requirements, mao ) => {
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
		
		addCmd({
			aliases: 'transliterate translit tr',
			description: {
				short: 'transliterates text (EN <=> RU)',
				full: `Transliterates text from English to Russian and vice versa`,
				usages: [
					[`<language (EN/RU)>`, '[text or message ID]', 'transliterates $2 to $1'],
					[`<lang>`, 'transliterates last message to $1'],
					[`<lang>`, `<text>`, 'transliterates the $2 to $1'],
					[`<lang>`, `<message ID>`, 'fetches a message by $2 and transliterates it to $1'],
				],
			},
			callback: async ( msg, args ) => {
				const lang = args[0].toLowerCase()

				if( lang != 'ru' && lang != 'en' )
					return msg.send( 'Invalid language! Use `EN` or `RU`' )
				
				if( args[1] ){
					let text = args.get_string(1)
					
					if( text.match( /^\d+$/ ) ){ // Message ID provided
						let m = await msg.channel.messages.fetch( args[1] )
			
						if( m ){
							text = translit( lang == 'en', m.content )
			
							if( text )
								msg.send( Embed()
									.setAuthor( m.member.user.tag, m.member.user.avatarURL() )
									.setDescription( text )
								)
							else
								msg.send( 'Failed to transliterate the message.' )
						} else
							msg.send( 'Failed to fetch the message! The message doesn\'t exist, or is in another channel.' )
					} else { // Text provided
						text = translit( lang == 'en', text )
			
						if( text )
							msg.send( Embed()
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
							msg.send( Embed()
								.setAuthor( m.member.user.tag, m.member.user.avatarURL() )
								.setDescription( text )
							)
						else
							msg.send( 'Failed to transliterate the message.' )
					}
				}
			},
		})
	}
}