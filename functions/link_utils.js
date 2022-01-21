module.exports = {
	requirements: 'client MM cp',
	init: ( requirements, mao ) => {
		requirements.define( global )

		const utils = [
			// Discord CDN link fixer
			async ( msg, react ) => {
				const badURLs = msg.content.match( /https?:\/\/media\.discordapp\.net\/\S+\.(?:mp4|webm)/g )

				if( badURLs && badURLs.length !== 0 )
					return badURLs.map( url => url.replace( /^https?:\/\/media\.discordapp\.net/, 'https://cdn.discordapp.com' ) )
			},

			// Twitter direct video link provider
			async ( msg, react ) => {
				let tweetIDs = Array.from( msg.content.matchAll( /https?:\/\/twitter\.com\/[^\/\s]+\/status\/\d+/gmi ) )

				if( tweetIDs.length === 0 )
					return

				react()

				tweetIDs = await Promise.all(
					tweetIDs.map( url => new Promise( resolve => {
						const ytdl = cp.exec( 'youtube-dl --get-url ' + url )
						let stdout = ''
						ytdl.stdout.on( 'data', chunk => stdout += chunk )
						ytdl.once( 'exit', code => resolve( code === 0 ? stdout : null ) )
					}))
				)

				return tweetIDs
					.map( url => url?.matchFirst( /https?\S+/ ) )
			},
		]

		MM.pushHandler( 'link_utils', false, async msg => {
			if( msg.author.bot || msg.author.id === client.user.id )
				return

			let reaction = null

			function react(){
				reaction ??= msg.react( client.emojis.resolve( '822881934484832267' ) )
			}

			const links = await Promise.all( utils.map( util => util( msg, react ) ) )
				.then( links => links
					.filter( link => !!link )
					.join( '\n' )
				)

			if( links ){
				const promise = msg.send( links )

				if( reaction )
					Promise.all([ promise, reaction ])
						.then( () => msg.reactions.removeAll() )

				return true
			}
		})
	}
}