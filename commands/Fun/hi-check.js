// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
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
				const msgs = await msg.channel.messages.fetch({
					limit: 100,
					before: msg.id,
				}).catch( () => [] )

				await msg.getReferencedMessage()
					.then( ref => ref && msgs.unshift( ref ) )

				const hiMsg = msgs.find( m => m.id !== msg.id
					&& !m.isCommand
					&& /\bhi+\b/i.test( m.content )
				)

				return hiMsg
					? msg.send([
						hiMsg.author.toString(),
						'is',
						states.at( hiMsg.content.matchFirst( /\bh(i+)\b/i ).length - 1 ) || states.at(-1),
					].join( ' ' ) )
					: msg.send( "No `hi`s found" )
			}
		})
	}
}