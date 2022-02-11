module.exports = {
	requirements: 'client Embed',
	init: ( requirements, mao ) => {
		requirements.define( global )

		addCmd({
			aliases: 'emoji e',
			description: 'Sends random emoji that matches the keyword',
			callback: ( msg, args ) => {
				let match = args[0]?.match( /<a?:[\w_-]+:(\d+)>/ )

				if( !match )
					return msg.send( `Please provide an emoji` )

				const emoji = client.emojis.resolve( match[1], match[0] )

				if( !emoji )
					return msg.send( `Could not retrieve emoji` )

				return msg.send( Embed()
					.setDescription( `[${emoji.name}](${emoji.url})` )
					.setImage( emoji.url )
				)
			},
		})
	}
}