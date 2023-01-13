// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const axios = require( 'axios' )
		const discord = require( 'discord.js' )
		const Jimp = require( 'jimp' )
		const { Gelbooru } = require( '@/instances/booru' )
		const cb = require( '@/functions/cb' )
		const clamp = require( '@/functions/clamp' )
		const Embed = require( '@/functions/Embed' )
		const processing = require( '@/functions/processing' )
		const decodeHTMLEntities = require( '@/functions/decodeHTMLEntities' )

		async function parseTranslation( post_id ){
			const { data } = await axios.get( `https://gelbooru.com/index.php`, {
				params: {
					post_id,
					page: 'dapi',
					s: 'note',
					q: 'index',
					json: 1,
				}
			})

			const translations = Array.from( data.matchAll( /<note\b.+?\/>/gsi ), ([ note ]) => {
				const data = {}

				Array.from( note.matchAll( /(x|y|width|height|body)="(.+?)"/gsi ) )
					.forEach( ([, k, v]) => {
						if( k === 'body' )
							data.text = decodeHTMLEntities(v)
								.replace( /<br\s*\/?>/gi, '\n' )
								.replace( /<\/?\w+\b.*?\/?>/g, '' )
						else
							data[k] = Number(v)
					})

				return data
			})

			return translations.length === 0 ? null : translations
		}

		function drawRect( image, color, x, y, w, h ){
			image.scan( x, y, w, h, function( x, y, offset ){
				if( offset < 0 || offset >= this.bitmap.data.length )
					return

				this.bitmap.data.writeUInt32BE( color, offset, true )
			})
		}

		const solidBlack = 0x000000FF
		const postRE = /https?:\/\/(?:\w+\.)?gelbooru\.com\/index\.php.+?[?&]id=(\d+)/
		const imageRE = /https?:\/\/(?:\w+\.)?gelbooru\.com\/+(?:samples|images)\/\w+\/\w+\/(?:sample_)?(\w+)\.\w+\b/
		let fonts = {}

		function roundByBits( number ){
			let n = number
			let bits = 0

			while( n > 1 ){
				n >>= 1
				++bits
			}

			let min = 1 << bits
			let max = min << 1
			let diff = max - min
			return Math.round( ( number - min ) / diff ) * diff + min
		}

		function getAdaptiveFont( imageHeight ){
			const fontHeight = clamp( roundByBits( imageHeight / 64 ), 8, 128 )
			return `FONT_SANS_${fontHeight}_WHITE`
		}

		async function loadAdaptiveFont( imageHeight ){
			const font = getAdaptiveFont( imageHeight )

			if( !fonts[font] )
				fonts[font] = await Jimp.loadFont( Jimp[font] )

			return fonts[font]
		}

		addCommand({
			aliases: 'gelbooru-translate glbr-tr',
			description: {
				short: 'translates pics from gelbooru',
				full: [
					'Parses translation from gelbooru and draws it on the picture',
					'* may not work correctly',
				],
				usages: [
					[`<ID of a post/link to post/link to image from gelbooru CDN>`, 'searches for translation on gelbooru and draws the translation on a pic'],
				],
			},
			callback: async ( msg, args ) => {
				const message = await msg.send( processing( '👌' ) )

				let tags = ''

				if( !args[0] )
					return message.edit( `Please provide a link to a gelbooru post or a link to a picture stored on gelbooru CDN` )

				let id = args[0].matchFirst( /^\d+$/ )

				if( !id )
					id = args[0].matchFirst( postRE )

				if( id )
					tags = `id:${id}`
				else {
					const md5 = args[0].matchFirst( imageRE )
					if( md5 )
						tags = `md5:${md5}`
				}

				if( !tags )
					return message.edit( `Post ID or image MD not found` )

				const pic = await Gelbooru.posts( tags )
					.then( r => r.pics[0] )

				if( !pic )
					return message.edit( `Failed to parse picture` )

				const translations = await parseTranslation( id )
					.catch( async err => {
						await message.edit( cb( err ) )
						throw err
					})

				if( !translations )
					return message.edit( `No translations found for this picture` )

				const image = await Jimp.read( pic.full ?? pic.sample )
				const font = await loadAdaptiveFont( image.bitmap.height )

				translations.forEach( async ({ x, y, width, height, text }) => {
					text = text.replace( /\s*<br\s*\/>\s*/gi, ' ' )

					const textWidth = text.split( /\s+/g ).reduce( ( maxWidth, word ) => {
						const wordWidth = Jimp.measureText( font, word )
						return wordWidth > maxWidth ? wordWidth : maxWidth
					}, width )
					const textHeight = Jimp.measureTextHeight( font, text, textWidth )

					x += ( width - textWidth ) / 2
					y += ( height - textHeight ) / 2

					drawRect( image, solidBlack, x, y, textWidth, textHeight )
					image.print( font, x, y, {
						text,
						alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
						alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
					}, textWidth, textHeight )
				})

				return message.edit({
					content: null,
					embeds: [Embed()
						.setDescription( `[Original](${pic.post_url})` )
						.setImage( 'attachment://tr.jpg' )
						.setFooter({ text: 'Powered by ' + Gelbooru.name })
					],
					files: [
						new discord.AttachmentBuilder( await image.getBufferAsync( Jimp.MIME_JPEG ), {
							name: 'tr.jpg',
						})
					],
				})
					.catch( err => message.edit( cb( err ) ) )
			}, // callback
		}) // addCommand
	} // init
}
