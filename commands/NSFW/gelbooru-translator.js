module.exports = {
	requirements: 'join httpGet decodeHTMLEntities Jimp Gelbooru clamp',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		function parseTranslation( html ){
			const translations = []

			try {
				html.match( /<section\s+id="notes".+?>(.+?)<\/section>/si )[0]
					.match( /<article.+?<\/article>/gsi )
					.map( article => article.match( /data-(width="\d+").+?data-(height="\d+").+?data-(x="\d+").+?data-(y="\d+").+?data-(body=".+?")/mi ) )
					.forEach( t => {
						const translate = {
							x: true,
							y: true,
							width: true,
							height: true,
							body: true,
						}

						t.forEach( prop => {
							const data = prop.match( /^(\w+)="(.+?)"$/ )

							if( data ){
								let [, key, value] = data

								if( translate[key] ){
									translate[key] = /^\d+$/.test( value )
										? parseInt( value )
										: decodeHTMLEntities( value )
								}
							}
						})

						translations.push( translate )
					})
			} catch( err ){
				//console.error( err )
				return null
			}

			if( translations.length === 0 )
				return null

			return translations
		}

		function drawRect( image, color, x, y, w, h ){
			image.scan( x, y, w, h, function( x, y, offset ){
				if( offset < 0 || offset >= this.bitmap.data.length )
					return

				this.bitmap.data.writeUInt32BE( color, offset, true )
			})
		}

		const solidBlack = 0x000000FF
		const postRE = /https?\:\/\/(?:\w+\.)?gelbooru\.com\/index\.php.+?[?&]id=(\d+)/
		const imageRE = /https?\:\/\/(?:\w+\.)?gelbooru\.com\/+(?:sampl|imag)es\/\w+\/\w+\/(?:sample_)?(\w+)\.\w+\b/
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

		function getAddaptiveFont( imageHeight ){
			const fontHeight = clamp( roundByBits( imageHeight / 64 ), 8, 128 )
			return `FONT_SANS_${fontHeight}_WHITE`
		}

		async function loadAddaptiveFont( imageHeight ){
			const font = getAddaptiveFont( imageHeight )

			if( !fonts[font] )
				fonts[font] = await Jimp.loadFont( Jimp[font] )

			return fonts[font]
		}
		
		addCmd({
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
				const emoji = client.emojis.resolve( '822881934484832267' )
				const message = await msg.send( emoji ? emoji.toString() : '👌' )

				let tags = ''
				
				if( !args[0] ){
					message.edit( `Please provide a link to a gelbooru post or a link to a picture stored on gelbooru CDN` )
					return
				}

				let id = args[0].matchFirst( /^\d+$/ )
				
				if( !id )
					id = args[0].matchFirst( postRE )
				
				if( id )
					tags = `id:${id}`
				else {
					const md5 = args[0].matchFirst( imageRE )
					if( md5 ) tags = `md5:${md5}`
				}

				if( !tags ){
					message.edit( `Post ID or image MD not found` )
					return
				}

				let pic

				await Gelbooru.q( tags ).then( ({ pics }) => {
					pic = pics[0]
				})

				if( !pic ){
					message.edit( `Failed to parse picture` )
					return
				}
				
				httpGet( pic.post_url ).then( body => {
					const translations = parseTranslation( body )

					if( !translations ){
						message.edit( `No translations found for this picture` )
						return
					}
					
					Jimp.read( pic.full ?? pic.sample ).then( async image => {
						const font = await loadAddaptiveFont( image.bitmap.height )

						translations.forEach( async ({ x, y, width, height, body: text }) => {
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
						
						image.getBuffer( Jimp.AUTO, async ( err, buffer ) => {
							if( err ){
								message.edit( cb( err ) )
								return
							}
							
							await msg.send({ files: [buffer] })
							message.delete()
						})
					}) // Jimp.read
				}) // httpGet
			},
		}) // addCmd
	}
}