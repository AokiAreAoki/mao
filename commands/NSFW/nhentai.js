module.exports = {
	requirements: 'NH client',
	init: ( requirements, mao ) => {
		requirements.define( global )

		addCmd({
			aliases: 'download-doujinshi dodo',
			description: {
				single: 'downloads a doujinshi from nhentai.net',
				usages: [
					['<doujinshi URL or ID>', 'downloads a doujinshi by $1 from nhentai.net'],
				],
			},
			async callback( msg, args ){
				if( !msg.channel.nsfw )
					return msg.send( `This isn't an NSFW channel!` )

				const id = args[0]?.matchFirst( /(?:https?:\/\/nhentai\.net\/g\/)?(\d+)/ )

				if( !id )
					return msg.send( `Provide a doujinshi ID` )

				const loading = client.emojis.resolve( '822881934484832267' ).toString()
				const promise = msg.send( loading )
				const book = await NH.getBook( id )
				const pages = book.pages.map( page => NH.getImageURL( page ) )
				const cover = pages.shift()

				let title = ''
				const titleTypes = ['pretty', 'english', ...Object.keys( book.title )]

				while( !title ){
					const titleType = titleTypes.shift()

					if( titleType )
						title = book.title[titleType]
					else
						title = 'no title :('
				}

				const embeds = [ Embed()
					.setTitle( title )
					.setDescription( `Tags: \`${book.tags.join( "`, `" )}\`` )
					.setImage( cover )
				]

				const message = await promise
				const thread = await message.startThread({
					name: title,
				})
				await message.edit({ embeds })

				for( let i in pages ){
					await new Promise( resolve => setTimeout( resolve, 1337 ) )

					if( message.deleted ){
						thread.delete()
						break
					}

					await thread.send( pages[i] )

					++i
					if( i % 5 === 0 && i !== pages.length )
						message.edit({ content: `${i}/${pages.length} ${loading}` })
				}

				message.edit({ embeds, content: null })
			},
		})
	}
}