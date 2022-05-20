module.exports = {
	requirements: 'client MM',
	init: ( requirements, mao ) => {
		requirements.define( global )

		MM.pushHandler( 'sed', true, async msg => {
			if( msg.author.bot || msg.author.id === client.user.id )
				return

			if( msg.content?.substring( 0, 4 ).toLowerCase() !== 'sed/' )
				return

			let s = msg.content.substring(4)
			let regexp = s.matchFirst( /^(.+?[^\\])\// )
			const replacement = s.substring( regexp.length + 1 )
			regexp = new RegExp( regexp )

			const m = await msg.channel.messages.fetch({
				before: msg.id,
				limit: 100,
			})
				.then( mm => mm.find( m => regexp.test( m.content ) ) )

			return msg.send( m
				? m.author.toString() +': ' + m.content.replace( regexp, replacement )
				: `Could not find any matches`
			)
		})
	}
}
