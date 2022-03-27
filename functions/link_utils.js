module.exports = {
	requirements: 'client MM cp processing',
	init: ( requirements, mao ) => {
		requirements.define( global )

		const utils = [
			// Discord CDN link fixer
			async ( msg, react ) => {
				const badURLs = msg.content.match( /https?:\/\/media\.discordapp\.net\/\S+\.(?:mp4|webm)/gi )

				if( badURLs && badURLs.length !== 0 )
					return badURLs.map( url => url.replace( /^https?:\/\/media\.discordapp\.net/, 'https://cdn.discordapp.com' ) )
			},

			// Twitter/Reddit direct links provider
			async ( msg, react ) => {
				let links = [].concat( ...[
					/https?:\/\/twitter\.com\/[^\/\s]+\/status\/\d+/gmi,
					/https?:\/\/(?:\w+\.)?reddit.com\/r\/\S+/gmi,
				].map( re => Array.from( msg.content.matchAll( re ) ) ) )

				if( links.length === 0 )
					return

				react()

				links = await Promise.all(
					links.map( url => new Promise( resolve => {
						const ytdl = cp.spawn( 'youtube-dl', ['--get-url', url[0]] )
						let stdout = ''
						ytdl.stdout.on( 'data', chunk => stdout += chunk )
						ytdl.once( 'exit', code => resolve( code === 0 ? stdout : null ) )
					}))
				)

				return links
					.map( url => url?.matchFirst( /https?\S+/ ) )
			},
		]

		MM.pushHandler( 'link_utils', false, async msg => {
			if( msg.author.bot || msg.author.id === client.user.id )
				return

			let reaction = null

			function react(){
				reaction ??= msg.react( processing( '👌' ) )
			}

			const links = await Promise.all( utils.map( util => util( msg, react ) ) )
				.then( links => [].concat( ...links )
					.filter( link => !!link )
					.join( '\n' )
				)

			let abortHQ = false

			if( links ){
				await msg.send( links )
				abortHQ = true
			}

			if( reaction ){
				await reaction
				msg.reactions.removeAll()
			}

			return abortHQ
		})
	}
}
