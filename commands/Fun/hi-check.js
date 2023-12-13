// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const { Collection } = require( 'discord.js' )
		const MM = require( '@/instances/message-manager' )
		const timer = require( '@/re/timer' )

		const HI_LIFETIME = 600e3
		const COOLDOWN = 900e3
		const STATES = [
			"normal",
			"lgbt",
			"a femboy",
			"prolly into you",
			"definitely into you (sexually)",
			"mysterious",
			"a catgirl (nyahhhh)",
			"having a ketamine overdose",
		]

		const hasHi = string => /(\bhi+|:3+)\b/i.test( string )
		const hiLvl = string => Array.from( string.matchAll( /(?:\bh(i+)|:(3+))\b/gi ) )
			.map( match => match
				? ( match[1] || match[2] ).length - 1
				: 0
			)
			.reduce( ( acc, lvl ) => acc + lvl, 0 )

		let streaks = new Collection()

		timer.create( 'hi', 300, 0, () => {
			streaks = streaks.filter( streak => {
				streak.entries = streak.entries.filter( e => e.deadline > Date.now() )
				return streak.deadline > Date.now()
			})
		})

		MM.pushHandler( 'hi', false, msg => {
			if( !hasHi( msg.content ) )
				return

			const streak = streaks.get( msg.author.id ) ?? {
				entries: [],
				cooldown: 0,
				deadline: 0,
			}

			if( streak.cooldown > Date.now() )
				return

			const lvl = hiLvl( msg.content )
			const deadline = Date.now() + HI_LIFETIME

			streak.deadline = deadline
			streak.entries = streak.entries.filter( e => e.deadline > Date.now() )
			streak.entries.push({ lvl, deadline })
			streaks.set( msg.author.id, streak )

			const sumLvl = Math.floor(
				streak.entries.reduce( ( sum, entry ) => sum + entry.lvl, 0 ) / streak.entries.length
			)

			if( sumLvl + streak.entries.length * 2 > 10 ){
				msg.response.session.update([
					msg.author.toString(),
					'is having a ketamine overdose',
				].join( ' ' ) )

				streak.deadline = streak.cooldown = Date.now() + COOLDOWN
			}
		})

		addCommand({
			aliases: 'hi-check check-hi',
			description: 'determines a state of a person by their `hi`',
			async callback({ msg, session }){
				const msgs = await msg.channel.messages
					.fetch({
						limit: 100,
						before: msg.id,
					})
					.then( c => c.toArray() )
					.catch( () => [] )

				await msg.getReferencedMessage()
					.then( ref => ref && msgs.unshift( ref ) )

				const hiMsg = msgs.find( m => m.id !== msg.id && !m.isCommand && hasHi( m.content ) )

				return session.update( hiMsg
					? [
						hiMsg.author.toString(),
						'is',
						STATES.at( hiLvl( hiMsg.content ) ) || STATES.at(-1),
					].join( ' ' )
					: "No `hi`s found"
				)
			}
		})
	}
}
