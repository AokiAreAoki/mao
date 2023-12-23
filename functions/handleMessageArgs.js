// eslint-disable-next-line no-global-assign
require = global.alias(require)

const discord = require( 'discord.js' )
const Jimp = require( 'jimp' )
const cb = require( '@/functions/cb' )
const Embed = require( '@/functions/Embed' )
const cutIfLimit = require( '@/functions/cutIfLimit' )

module.exports = function handleMessageArgs( content, options = {} ){
	if( content == null )
		throw new Error( 'content can not be ' + String( content ) )

	if( typeof content === 'object' ){
		if( content instanceof discord.GuildEmoji ){
			options.content = content.toString()
		} else if( content instanceof discord.EmbedBuilder ){
			options.embeds = [content]
		} else if( content instanceof Jimp ){
			content.getBuffer( Jimp.MIME_JPEG, ( err, buffer ) => {
				if( err ){
					const embed = Embed()
						.setColor( 0xFF0000 )
						.setDescription( 'Looks like i had to send a picture but something went wrong' )
						.addFields({ name: 'Error:', value: cb( err ) })

					options.embeds = [embed]
				} else
					options.files = [buffer]
			})
		} else {
			options = content
		}
	} else {
		options.content = String( content )
	}

	if( options.content || options.embeds || options.files ){
		options.content ??= null
		options.embeds ??= []
		options.files ??= []
	}

	options.allowedMentions ??= {}
	options.allowedMentions.repliedUser ??= false

	if( options.cb )
		options.content = cb( options.content, options.cb )

	delete options.cb

	return cutIfLimit( options )
}
