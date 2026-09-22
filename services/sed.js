// eslint-disable-next-line no-global-assign
require = global.alias(require)

/** @type {import('@/libs/service-manager').Inclusion} */
module.exports = {
	id: "sed",
	name: "SED",
	init({ sb }){
		const client = require( '@/instances/client' )
		const cb = require( '@/utils/cb' )
		const MESSAGE_HANDLER_PRIORITIES = require( '@/constants/message-handler-priorities' )

		sb.onMessage( MESSAGE_HANDLER_PRIORITIES.SED, async msg => {
			if( msg.author.bot || msg.author.id === client.user.id )
				return

			const session = msg.response.session

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
				return session.update( cb( err ) )
			}

			const messages = await msg.channel.messages
				.fetch({
					before: msg.id,
					limit: 100,
				})
				.then( c => c.toArray() )
				.catch( () => [] )

			await msg.getReferencedMessage()
				.then( ref => ref && messages.unshift( ref ) )

			const message = messages.find( m => !m.isCommand && !m.sedIgnored && regexp.test( m.content ) )

			return session
				.update( message
					? `${message.author}: ${message.content.replace( regexp, replacement )}`
					: `Could not find any matches`
				)
				.then( responseMessage => {
					msg.sedIgnored = true
					responseMessage.sedIgnored = true
					return responseMessage
				})
		})
	}
}
