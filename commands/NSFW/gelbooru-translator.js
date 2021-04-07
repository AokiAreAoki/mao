module.exports = {
	requirements: 'join httpGet decodeHTMLEntities Jimp Gelbooru',
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

		let font
		const solidBlack = 0x000000FF
		const postRE = /https?\:\/\/(?:\w+\.)?gelbooru\.com\/index\.php.+?[?&]id=(\d+)/
		const imageRE = /https?\:\/\/(?:\w+\.)?gelbooru\.com\/+(?:sampl|imag)es\/\w+\/\w+\/(?:sample_)?(\w+)\.\w+\b/

		// console.log( `https://gelbooru.com/index.php?page=post&s=view&id=6004682&tags=translated`.matchFirst( postRE ) )
		// console.log( `https://img3.gelbooru.com//samples/8b/40/sample_8b40135999a39fb10d90881d28581bc4.jpg`.matchFirst( imageRE ) )
		// console.log( `https://img3.gelbooru.com/images/8b/40/8b40135999a39fb10d90881d28581bc4.jpg`.matchFirst( imageRE ) )

		addCmd( 'gelbooru-translate glbr-tr', {
			short: 'parses translation from gelbooru and draws it on the picture',
			full: 'Usage: `gelbooru-translate <ID of a post/link to post/link to image on gelbooru CDN>`\n*may not work correctly',
		}, async ( msg, args ) => {
			const emoji = client.emojis.resolve( '822881934484832267' )
			const message = await msg.send( emoji ? emoji.toString() : '👌' )

			if( !font )
				font = await Jimp.loadFont( Jimp.FONT_SANS_32_WHITE )

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
			
			httpGet( pic.post_url ).then( async body => {
				const translations = parseTranslation( body )

				if( !translations ){
					message.edit( `No translations found for this picture` )
					return
				}
				
				Jimp.read( pic.full ?? pic.sample ).then( image => {
					translations.forEach( ( { x, y, width, height, body }, index ) => {
						const textWidth = body.split( /\s+/g ).reduce( ( maxWidth, word ) => {
							const wordWidth = Jimp.measureText( font, word )
							return wordWidth > maxWidth ? wordWidth : maxWidth
						}, width )
						const textHeight = Jimp.measureTextHeight( font, body, textWidth )

						drawRect( image, solidBlack, x + ( width - textWidth ) / 2, y + ( height - textHeight ) / 2, textWidth, textHeight )

						image.print( font, x + ( width - textWidth ) / 2, y + ( height - textHeight ) / 2, {
							text: body,
							alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
							alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
						}, textWidth, textHeight )
					})
					
					image.getBuffer( Jimp.AUTO, async ( err, buffer ) => {
						if( err )
							message.edit( cb( err ) )
						else {
							await msg.send( { files: [buffer] } )
							message.delete()
						}
					})
				}) // Jimp.read
			}) // Promise.all
		}) // addCmd
	}
}
