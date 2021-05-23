module.exports = {
	requirements: 'embed',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
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
		const maxN = numbers.length

		addCmd( 'simplevote vote', {
			short: 'creates a simple vote',
			full: `Usage:\`\`\`markdown`
			+ '\n-vote <query>'
			+ '\n      [option1]'
			+ '\n      [option2]'
			+ '\n      [option3]'
			+ '\n      [...]'
			+ `\n      [option${maxN}]`
			+ '\n\`\`\`'
			+ `Use new lines to add up to ${maxN} custom options\nor pass no options to create a simple yes/no vote.`
		}, async ( msg, args, get_string_args ) => {
			if( args.length === 0 )
				return msg.send( 'Usage: `-help vote`' )
			
			const options = get_string_args().split( /\n+/ )
			let query = options.shift()
			const options_amount = Math.min( options.length, maxN )

			if( options_amount !== 0 ){
				//query += '\n'

				for( let i = 0; i < options_amount; ++i )
					query += `\n${numbers[i]} ${options[i]}`
			}

			let m = await msg.send( embed()
				.setAuthor( msg.author.tag, msg.author.avatarURL(64) )
				.addField( 'Vote:', query )
			)
			
			if( options_amount === 0 ){
				await m.react( '✅' )
				await m.react( '❌' )
			} else
				for( let i = 0; i < options_amount; ++i )
					await m.react( `${numbers[i]}` )
		})
	}
}