module.exports = {
	requirements: 'client MM cp fs processing discord join binarySearch',
	init: ( requirements, mao ) => {
		requirements.define( global )

		const cacheTimeout = 2 * 24 * 3600e3

		class TempCache {
			static globalCache = []

			static sortGlobal(){
				this.globalCache.sort( ( a, b ) => a.timeout < b.timeout )
			}

			static insertGlobal( entry ){
				const index = binarySearch( this.globalCache, v => v.timeout < entry.timeout )
				this.globalCache.splice( index, 0, entry )
			}

			static {
				// setInterval( () => {
				// 	let first

				// 	console.clear()
				// 	console.log( printify( this.globalCache ) )

				// 	while( ( first = this.globalCache[0] ) && first.timeout < Date.now() )
				// 		this.globalCache.shift()
				// }, 600 /*e3*/ )
			}

			timeout
			entries = new Map()

			constructor( cacheTimeout ){
				this.timeout = cacheTimeout
			}

			set( key, value ){
				const entry = this.entries.get( key )

				if( entry ){
					entry.timeout = Date.now() + this.timeout
					entry.value = value
					TempCache.sortGlobal()
					return
				}

				const newEntry = {
					value,
					timeout: Date.now() + this.timeout,
					cache: this,
				}

				this.entries.set( key, newEntry )
				TempCache.insertGlobal( newEntry )
			}

			get( key ){
				return this.entries.get( key )
			}
		}

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
			async ( msg, cache, react ) => {
				const badURLs = msg.content.match( /https?:\/\/media\.discordapp\.net\/\S+\.(?:mp4|webm|mov)/gi )

				if( badURLs && badURLs.length !== 0 )
					return badURLs.map( url => url.replace( /^https?:\/\/media\.discordapp\.net/, 'https://cdn.discordapp.com' ) )
			},

			// Twitter direct links provider
			async ( msg, cache, react ) => {
				let links = [
					/https?:\/\/twitter\.com\/([^\/\s]+)\/status\/(\d+)/gmi,
				]
					.map( re => Array.from( msg.content.matchAll( re ) ) )
					.flat(1)

				if( links.length === 0 )
					return

				const immediate = setImmediate( react )

				links = await Promise.all( links.map( async url => {
					const key = url[1] + '/' + url[2]

					if( cache.get( key ) )
						return cache.get( key ).value

					const directLinkPromise = spawnAsync( 'yt-dlp', ['--get-url', url[0]] )
					cache.set( key, directLinkPromise )

					return directLinkPromise.then( directLink => {
						cache.set( key, directLink )
						return directLink
					})
				}))

				clearImmediate( immediate )

				return links
					.map( url => url?.matchFirst( /https?\S+/ ) )
			},

			// Reddit/TikTok files provider
			async ( msg, cache, react ) => {
				let links = [
					/https?:\/\/(?:\w+\.)?(reddit)\.com\/r\/(\S+)/gmi,
					/https?:\/\/(?:\w+\.)?(tiktok)\.com\/(\w+)/gmi,
				]
					.map( re => Array.from( msg.content.matchAll( re ) ) )
					.flat(1)

				if( links.length === 0 )
					return

				const immediate = setImmediate( react )
				const files = await Promise.all( links.map( async url => {
					const key = url[1] + '/' + url[2]

					if( cache.get( key ) ){
						const path = cache.get( key ).value

						if( fs.existsSync( path ) )
							return path
					}

					const args = ['-o', '%(id)s.%(ext)s', url[0]]
					await spawnAsync( 'yt-dlp', args, { cwd: "/tmp" } )

					args.unshift( '--get-filename' )
					const pathPromise = spawnAsync( 'yt-dlp', args, { cwd: "/tmp" } )
					cache.set( key, pathPromise )

					return pathPromise.then( path => {
						cache.set( key, path )
						return path
					})
				}))

				clearImmediate( immediate )

				return files
					.map( paths => paths?.split( '\n' ) )
					.flat(1)
					.filter( s => !!s )
					.map( path => new discord.MessageAttachment( join( '/tmp', path ), path ) )
			},
		]

		const caches = {}
		utils.forEach( callback => caches[callback] = new TempCache( cacheTimeout ) )

		MM.pushHandler( 'link_utils', false, async msg => {
			if( msg.author.bot || msg.author.id === client.user.id )
				return

			let reaction = null

			function react(){
				reaction ??= msg.react( processing( '👌' ) )
			}

			const files = []
			const content = await Promise.all( utils.map( util => util( msg, caches[util], react ) ) )
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
