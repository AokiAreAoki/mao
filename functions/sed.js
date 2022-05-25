module.exports = {
	requirements: 'client MM cb',
	init: ( requirements, mao ) => {
		requirements.define( global )

		MM.pushHandler( 'sed', true, async msg => {
			if( msg.author.bot || msg.author.id === client.user.id )
				return

			const [
				sed,
				flags,
			] = msg.content?.match( /^sed([a-z]{0,5})\//i ) ?? []

			if( !sed )
				return

			let s = msg.content.substring( sed.length )
			let regexp = s.matchFirst( /^(.*?[^\\])\// )

			if( !regexp )
				return

			const replacement = s.substring( regexp.length + 1 )

			try {
				regexp = new RegExp( regexp, flags ?? '' )
			} catch( err ){
				return msg.send( cb( err ) )
			}

			const m = await msg.channel.messages.fetch({
				before: msg.id,
				limit: 100,
			})
				.then( mm => mm.find( m => regexp.test( m.content ) ) )

			return msg.send( m
				? `${m.author}: ${m.content.replace( regexp, replacement )}`
				: `Could not find any matches`
			)
		})
	}
}
