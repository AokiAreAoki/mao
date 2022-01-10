module.exports = {
	requirements: 'client MM cp',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		MM.pushHandler( 'direct_link_provider', false, msg => {
			if( msg.author.bot || msg.author.id === client.user.id )
				return

			let tweetIDs = Array.from( msg.content.matchAll( /https?:\/\/twitter\.com\/[^\/\s]+\/status\/\d+/gmi ) )

			if( tweetIDs.length === 0 )
				return

			const messagePromise = msg.send( client.emojis.resolve( '822881934484832267' ).toString() )

			tweetIDs = tweetIDs.map( url => new Promise( resolve => {
				const ytdl = cp.exec( 'youtube-dl --get-url ' + url )
				let stdout = ''
				ytdl.stdout.on( 'data', chunk => stdout += chunk )
				ytdl.once( 'exit', code => resolve( code === 0 ? stdout : null ) )
			}))

			Promise.all( tweetIDs ).then( async tweetIDs => {
				tweetIDs = tweetIDs
					.map( url => url?.matchFirst( /https?\S+/ ) )
					.filter( url => !!url )
					.join( '\n' )

				const message = await messagePromise

				if( tweetIDs )
					message.edit( tweetIDs )
				else
					message.delete()
			})
		})
	}
}