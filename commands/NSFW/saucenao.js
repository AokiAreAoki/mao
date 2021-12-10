module.exports = {
	requirements: 'sauce Embed Collection',
	init: ( requirements, mao ) => {
		requirements.define( global )

		function prettify( string ){
			return string.replace( /_/g, ' ' ).replace( /\b((\w)(\w*))/g, ( match, word, firstLetter, rest ) => {
				if( word === 'id' )
					return 'ID'
					
				return firstLetter.toUpperCase() + rest
			})
		}

		async function sendSauce( msg, url ){
			const emoji = client.emojis.resolve( '822881934484832267' )
			const messagePromise = msg.send( Embed()
				.setTitle( emoji.toString() )
			)
			
			const sauces = await sauce.find( url, false )
				.catch( () => null )

			if( !sauces || sauces.size === 0 )
				return msg.send( 'Sauce not found :(' )

			const embeds = sauces.map( ( { header, data }, page ) => {
				const description = [
					['Similarity', header.similarity],
				]

				for( const k in data ){
					if( k.endsWith( '_id' ) || k === 'ext_urls' )
						continue
						
					if( !data[k] )
						continue

					description.push( [prettify(k), data[k]] )
				}

				const ids = Object.keys( data ).filter( k => k.endsWith( '_id' ) )

				data?.ext_urls?.forEach?.( ( url, i ) => {
					const sourceName = prettify( ids[i] )
					const sourceID = data[ids[i]]
					description.push( [sourceName, sourceID, url.replace( /\)/g, '%29' )] )
				})

				return Embed()
					.setTitle( header.index_name )
					.setDescription( description.map( ([ key, value, url ]) => {
						if( url )
							value = `[${value}](${url})`

						return `**${key}**: ${value}`
					}).join( '\n' ) )
					.setImage( header.thumbnail )
					.setFooter( `Page: ${page + 1}/${sauces.length}` )
			})
			
			messagePromise.then( message => {
				msg.sauceMessage = message
				msg.author.createPaginator()
					.setPages( embeds.length )
					.onPageChanged( page => embeds[page] )
					.setMessage( message )
			})
		}

		addCmd({
			aliases: 'saucenao sauce',
			description: 'WIP',
			callback: async ( msg, args ) => {
				if( args[0] )
					return sendSauce( msg, args[0] )
				
				const msgs = await msg.channel.messages.fetch({ limit: 100 })
					.catch( () => new Collection() )

				if( msgs.size === 0 )
					return msg.send( 'No messages found :(' )

				let url
				const found = msgs.some( msg => {
					if( url = msg.content.matchFirst( /(https?:\/\/\S+\.(jpe?g|png|webm|gif|bmp))/i ) )
						return true

					if( url = msg.attachments.find( a => a.contentType.indexOf( 'image' ) !== -1 )?.url )
						return true

					return false
				})

				if( found )
					sendSauce( msg, url )
			},
		})
	}
}