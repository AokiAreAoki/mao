// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const client = require( '@/instances/client' )
		const MM = require( '@/instances/message-manager' )
		const cb = require( '@/functions/cb' )

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

			let replacement = s.substring( regexp.length + 1 )
				.replace( /\\n/g, '\n' )
				.replace( /\\t/g, '\t' )

			if( `"'\``.indexOf( replacement[0] ) !== -1 && replacement.at(0) === replacement.at(-1) )
				replacement = replacement.substring( 1, replacement.length - 1 )

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
