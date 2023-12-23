// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )
		const Embed = require( '@/functions/Embed' )

		addCommand({
			aliases: 'emoji e',
			description: 'Sends random emoji that matches the keyword',
			callback({ args, session }){
				let match = args[0]?.match( /<a?:[\w_-]+:(\d+)>/ )

				if( !match )
					return session.update( `Please provide an emoji` )

				const emoji = client.emojis.resolve( match[1], match[0] )

				if( !emoji )
					return session.update( `Could not retrieve emoji` )

				return session.update( Embed()
					.setDescription( `[${emoji.name}](${emoji.url})` )
					.setImage( emoji.url )
				)
			},
		})
	}
}