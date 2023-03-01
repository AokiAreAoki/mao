// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){

		const start = "This person is "
		const states = [
			"normal",
			"lgbt",
			"a femboy",
			"prolly into you",
			"definitely into you (sexually)",
			"mysterious",
			"a catgirl (nyahhhh)",
			"having a ketamine overdose",
		]

		addCommand({
			aliases: 'hi-check check-hi hi',
			description: 'determines a state of a person by their `hi`',
			callback: async msg => {
				const msgs = await msg.channel.messages.fetch({ limit: 100, before: msg.id })
					.then( c => c.toArray() )
					.catch( () => [] )

				await msg.getReferencedMessage()
					.then( ref => ref && msgs.unshift( ref ) )

				const hiMsg = msgs.find( m => /hi+/i.test( m.content ) )

				if( hiMsg ){
					const state = states.at( hiMsg.content.matchFirst( /h(i+)/i ).length - 1 ) || states.at(-1)
					return hiMsg.send( start + state )
				}

				return msg.send( "No `hi`s found" )
			}
		})
	}
}