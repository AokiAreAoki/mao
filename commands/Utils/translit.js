// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const Embed = require( '@/functions/Embed' )

		const en = `qwertyuiop[]asdfghjkl;'zxcvbnm,./QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>?@#$^&\`~`
		const ru = `йцукенгшщзхъфывапролджэячсмитьбю.ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,"№;:?ёЁ`
		const toEN = {}, toRU = {}

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
					const text = args.getRaw(1)

					if( text.match( /^\d+$/ ) ){ // Message ID provided
						const message = await msg.channel.messages.fetch( args[1] )

						if( message ){
							const transliteratedText = transliterate( lang, message.content )

							if( transliteratedText )
								msg.send( Embed()
									.setAuthor({
										name: message.author.tag,
										iconURL: message.author.avatarURL(),
									})
									.setDescription( transliteratedText )
								)
							else
								msg.send( 'Failed to transliterate the message.' )
						} else
							msg.send( 'Failed to fetch the message! The message doesn\'t exist, or is in another channel.' )
					} else { // Text provided
						const transliteratedText = transliterate( lang, text )

						if( transliteratedText )
							msg.send( Embed()
								.setAuthor({
									name: msg.author.tag,
									iconURL: msg.author.avatarURL(),
								})
								.setDescription( transliteratedText )
							)
						else
							msg.send( 'Failed to transliterate the message.' )
					}
				} else { // Nothing provided
					let message = null
					const ref = await msg.getReferencedMessage()
					const mm = await msg.channel.messages.fetch({ limit: 1, before: msg.id })

					if( ref )
						message = ref
					else if( mm.size != 0 )
						message = mm.first()

					if( !message )
						msg.send( 'Previous message not found.' )

					const transliteratedText = transliterate( lang, message.content )

					if( transliteratedText )
						msg.send( Embed()
							.setAuthor({
								name: message.author.tag,
								iconURL: message.author.avatarURL(),
							})
							.setDescription( transliteratedText )
						)
					else
						msg.send( 'Failed to transliterate the message.' )
				}
			},
		})
	}
}