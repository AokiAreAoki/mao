module.exports = {
	requirements: 'client MM cp processing discord join',
	init: ( requirements, mao ) => {
		requirements.define( global )

		function spawnAsync( program, args, options ){
			return new Promise( resolve => {
				const ytdl = cp.spawn( program, args, options )
				let stdout = ''
				ytdl.stdout.on( 'data', chunk => stdout += chunk )
				ytdl.once( 'exit', code => resolve( code === 0 ? stdout : null ) )
			})
		}

		const utils = [
			// Discord CDN link fixer
			async ( msg, react ) => {
				const badURLs = msg.content.match( /https?:\/\/media\.discordapp\.net\/\S+\.(?:mp4|webm|mov)/gi )

				if( badURLs && badURLs.length !== 0 )
					return badURLs.map( url => url.replace( /^https?:\/\/media\.discordapp\.net/, 'https://cdn.discordapp.com' ) )
			},

			// Twitter direct links provider
			async ( msg, react ) => {
				let links = [
					/https?:\/\/twitter\.com\/[^\/\s]+\/status\/\d+/gmi,
				]
					.map( re => Array.from( msg.content.matchAll( re ) ) )
					.flat(1)

				if( links.length === 0 )
					return

				react()
				links = await Promise.all( links.map( url => spawnAsync( 'youtube-dl', ['--get-url', url[0]] ) ) )

				return links
					.map( url => url?.matchFirst( /https?\S+/ ) )
			},

			// Reddit files provider
			async ( msg, react ) => {
				let links = [
					/https?:\/\/(?:\w+\.)?reddit.com\/r\/\S+/gmi,
				]
					.map( re => Array.from( msg.content.matchAll( re ) ) )
					.flat(1)

				if( links.length === 0 )
					return

				react()
				const files = await Promise.all( links.map( url => spawnAsync( 'youtube-dl', ['--get-filename', '-o', '%(id)s.%(ext)s', url[0]], { cwd: "/tmp" } ) ) )

				return files
					.filter( s => !!s )
					.map( paths => paths.split( '\n' ) )
					.flat(1)
					.filter( s => !!s )
					.map( path => new discord.MessageAttachment( join( '/tmp', path ), path ) )
			},
		]

		MM.pushHandler( 'link_utils', false, async msg => {
			if( msg.author.bot || msg.author.id === client.user.id )
				return

			let reaction = null

			function react(){
				reaction ??= msg.react( processing( '👌' ) )
			}

			const files = []
			const content = await Promise.all( utils.map( util => util( msg, react ) ) )
				.then( links => links
					.flat(1)
					.filter( link => {
						if( link instanceof discord.MessageAttachment ){
							files.push( link )
							return false
						}

						return !!link
					})
					.join( '\n' )
				)
				.then( s => s || null )

			const hasSomething = content || files.length !== 0

			if( hasSomething )
				await msg.send({ content, files })

			if( reaction ){
				await reaction
				msg.reactions.removeAll()
			}

			return hasSomething
		})
	}
}
