// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const NH = require( 'nhentai-api' )
		const Embed = require( '@/functions/Embed' )
		const processing = require( '@/functions/processing' )

		addCommand({
			aliases: 'download-doujinshi dodo',
			description: {
				single: 'downloads a doujinshi from nhentai.net',
				usages: [
					['<doujinshi URL or ID>', 'downloads a doujinshi by $1 from nhentai.net'],
				],
			},
			async callback({ msg, args, session }){
				if( !msg.channel.nsfw )
					return session.update( `This isn't an NSFW channel!` )

				const id = args[0]?.matchFirst( /(?:https?:\/\/nhentai\.net\/g\/)?(\d+)/ )

				if( !id )
					return session.update( `Provide a doujinshi ID` )

				const promise = session.update( processing() )
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

				const embeds = [Embed()
					.setTitle( title )
					.setDescription( `Tags: \`${book.tags.join( "`, `" )}\`` )
					.setImage( cover )
				]

				const message = await promise
				const thread = await message.startThread({
					name: title,
				})
				await session.update({ embeds })

				for( let i in pages ){
					await new Promise( resolve => setTimeout( resolve, 1337 ) )

					if( message.deleted ){
						thread.delete()
						break
					}

					await thread.send( pages[i] )

					++i
					if( i % 5 === 0 && i !== pages.length )
						session.update({ content: `${i}/${pages.length} ${processing()}` })
				}

				session.update({ embeds })
			},
		})
	}
}