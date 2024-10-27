// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const Embed = require( '@/functions/Embed' )

		addCommand({
			aliases: 'sticker s',
			description: 'Returns a link to a sticker',
			async callback({ msg, session }){
				const sticker = await msg.findRecent( message => message.stickers.first() )

				if( !sticker )
					return session.update( `Could not find a sticker` )

				return session.update( Embed()
					.setDescription( `[${sticker.name}](${sticker.url})` )
					.setImage( sticker.url )
				)
			},
		})
	}
}