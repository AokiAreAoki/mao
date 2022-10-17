// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const Embed = require( '@/functions/Embed' )

		let en = `qwertyuiop[]asdfghjkl;'zxcvbnm,./QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>?@#$^&\`~`
		let ru = `йцукенгшщзхъфывапролджэячсмитьбю.ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,"№;:?ёЁ`
		let toEN = {}, toRU = {}

		for( let i = 0; i < en.length; ++i ){
			toEN[ru[i]] = en[i]
			toRU[en[i]] = ru[i]
		}

		function transliterate( toENorRU, text ){
			const lang = toENorRU ? toEN : toRU
			let s = ''

			for( let i = 0; i < text.length; ++i )
				s += lang[text[i]] || text[i]

			return s
		}

		addCommand({
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
				let lang = args[0].toLowerCase()

				if( lang != 'ru' && lang != 'en' )
					return msg.send( 'Invalid language! Use `EN` or `RU`' )

				lang = lang == 'en'

				if( args[1] ){
					let text = args.getRaw(1)

					if( text.match( /^\d+$/ ) ){ // Message ID provided
						let m = await msg.channel.messages.fetch( args[1] )

						if( m ){
							text = transliterate( lang, m.content )

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
						text = transliterate( lang, text )

						if( text )
							msg.send( Embed()
								.setAuthor( msg.member.user.tag, msg.member.user.avatarURL() )
								.setDescription( text )
							)
						else
							msg.send( 'Failed to transliterate the message.' )
					}
				} else { // Nothing provided
					const mm = await msg.channel.messages.fetch({ limit: 1, before: msg.id })

					if( mm.size == 0 )
						msg.send( 'Previous message not found.' )
					else {
						let m = mm.first()
						let text = transliterate( lang, m.content )

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