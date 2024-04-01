// eslint-disable-next-line no-global-assign
require = global.alias(require)

const discord = require( 'discord.js' )
const Jimp = require( 'jimp' )
const _cb = require( '@/functions/cb' )
const Embed = require( '@/functions/Embed' )
const cutIfLimit = require( '@/functions/cutIfLimit' )

/**
 * @typedef {Object} CustomMessageOptions
 * @property {boolean} [mention]
 * @property {boolean} [cb]
 *
 * @typedef {discord.MessageEditOptions & CustomMessageOptions} MessageOptions
 */

/**
 * @param {boolean | number | string | MessageOptions | discord.GuildEmoji | discord.EmbedBuilder | Jimp} content
 * @param {Omit<MessageOptions, 'content'>} options
 * @returns {discord.MessageEditOptions}
 */
module.exports = function transformMessagePayload( content, options = {} ){
	if ( content instanceof discord.MessagePayload ){
		content.options = transformMessagePayload( content.options )
		return content
	}

	if( content == null )
		throw new Error( '`content` can not be ' + String( content ) )

	if( typeof content === 'object' ){
		switch( content.constructor ){
			default:
				options = content
				break

			case discord.GuildEmoji:
				options.content = content.toString()
				break

			case discord.EmbedBuilder:
				options.embeds = [content]
				break

			case Jimp:
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
				break
		}
	} else {
		options.content = String( content )
	}

	if( options.content || options.embeds || options.files ){
		options.content ??= null
		options.embeds ??= []
		options.files ??= []
	}

	const { cb, mention } = options
	options.allowedMentions ??= {}
	options.allowedMentions.repliedUser = mention != null ? mention : false

	if( cb )
		options.content = _cb( options.content, cb )

	return cutIfLimit( options )
}
