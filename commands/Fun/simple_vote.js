// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const Embed = require( '@/functions/Embed' )

		const numbers = [
			'1️⃣',
			'2️⃣',
			'3️⃣',
			'4️⃣',
			'5️⃣',
			'6️⃣',
			'7️⃣',
			'8️⃣',
			'9️⃣',
			'🔟',
		]
		const MAX = numbers.length

		addCommand({
			aliases: 'vote',
			description: {
				short: 'creates a simple vote',
				full: [
					'Crates a simple vote poll',
					'Use new lines to add custom options',
					'Pass no options to create a simple `yes`/`no` vote poll.',
					`* you can have up to ${MAX} options`,
				],
				usages: [
					['<query>', 'creates a simple `yes`/`no` vote poll'],
					[
						`<query>`,
						`\n[option1]`,
						`\n[option2]`,
						`\n[option3]`,
						`\n[...]`,
						`\n[option${MAX}]`,
						`creates an optioned vote poll`,
					],
				]
			},
			callback: async ( msg, args ) => {
				if( args.length === 0 )
					return msg.send( 'Usage: `-help vote`' )

				const options = args.getRaw().split( /\n+/ )
				let query = options.shift()
				const options_amount = Math.min( options.length, MAX )

				if( options_amount !== 0 ){
					//query += '\n'

					for( let i = 0; i < options_amount; ++i )
						query += `\n${numbers[i]} ${options[i]}`
				}

				let m = await msg.send( Embed()
					.setAuthor( msg.author.tag, msg.author.avatarURL(64) )
					.addFields({ name: 'Vote:', value: query })
				)

				if( options_amount === 0 ){
					await m.react( '✅' )
					await m.react( '❌' )
				} else
					for( let i = 0; i < options_amount; ++i )
						await m.react( `${numbers[i]}` )
			},
		})
	}
}