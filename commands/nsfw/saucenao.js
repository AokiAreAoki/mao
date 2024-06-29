// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const sauce = require( '@/instances/sauce' )
		const Embed = require( '@/functions/Embed' )
		const processing = require( '@/functions/processing' )

		function prettify( string ){
			return string.replace( /_/g, ' ' ).replace( /\b((\w)(\w*))/g, ( match, word, firstLetter, rest ) => {
				if( word === 'id' )
					return 'ID'

				return firstLetter.toUpperCase() + rest
			})
		}

		addCommand({
			aliases: 'saucenao sauce',
			description: '// TODO',
			async callback({ msg, args, session }){
				const url = args[0]?.trim() || await msg.findLastPic()

				if( !url )
					return session.update( `No media found or provided` )

				session.update( Embed().setDescription( processing() ) )

				const sauces = await sauce.find( url, false )
					.catch( () => null )

				if( !sauces || sauces.size === 0 )
					return session.update( Embed().setDescription( 'Sauce not found :(' ) )

				const embeds = sauces.map( ( { header, data }, page ) => {
					const description = [
						['Similarity', header.similarity],
					]
					const urls = []

					for( const k in data ){
						if( k.endsWith( '_id' ) || k === 'ext_urls' )
							continue

						if( !data[k] )
							continue

						description.push( [prettify(k), data[k]] )
					}

					const ids = Object.keys( data )
						.filter( k => k.endsWith( '_id' ) )

					data?.ext_urls?.forEach?.( ( url, i ) => {
						if( !ids[i] )
							return urls.push( url )

						const sourceName = prettify( ids[i] )
						const sourceID = data[ids[i]]
						description.push( [sourceName, sourceID, url?.replace( /\)/g, '%29' )] )
					})

					let stringDescription = description
						.map( ([ key, value, url ]) => {
							if( url )
								value = `[${value}](${url})`

							return `**${key}**: ${value}`
						})
						.join( '\n' )

					if( urls.length !== 0 )
						stringDescription += '\n' + urls.join( '\n' )

					return Embed()
						.setTitle( header.index_name )
						.setDescription( stringDescription )
						.setImage( header.thumbnail )
						.setFooter({ text: `Page: ${page + 1}/${sauces.length}` })
				})

				msg.author.createPaginator()
					.setPages( embeds.length )
					.onPageChanged( page => embeds[page] )
					.setMessage( await session.response.message )
			},
		})
	}
}
