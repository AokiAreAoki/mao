// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init(){
		const cp = require( 'child_process' )
		const fs = require( 'fs' )
		const { join } = require( 'path' )
		const ytdl = require( 'youtube-dl-exec' )

		const config = require( '@/config.yml' )
		const TEMP_FOLDER = require( '@/constants/temp-folder' )

		const client = require( '@/instances/client' )
		const MM = require( '@/instances/message-manager' )
		const { getSocksProxy } = require( '@/instances/proxy' )
		const zipline = require( '@/instances/zipline' )

		const Embed = require( '@/functions/Embed' )
		const processing = require( '@/functions/processing' )
		const binarySearch = require( '@/functions/binarySearch' )

		const CACHE_TIMEOUT = 2 * 24 * 3600e3

		function Entry({
			value,
			key,
			timeout,
			cache,
		}){
			this.value = value
			this.key = key
			this.timeout = timeout
			this.cache = cache

			for( const k in this )
				if( this[k] == null && k !== 'value' )
					throw TypeError( `options.${k} must be a valid value` )
		}

		class TempCache extends Map {
			static globalCache = []

			static sortGlobal(){
				this.globalCache.sort( ( a, b ) => a.timeout < b.timeout )
			}

			static insertGlobal( entry ){
				const index = binarySearch( this.globalCache, entry.timeout, v => v.timeout )
				this.globalCache.splice( index, 0, entry )
			}

			static {
				setInterval( () => {
					let first

					while( ( first = this.globalCache[0] ) && first.timeout < Date.now() ){
						const deletedEntry = this.globalCache.shift()
						deletedEntry.cache.delete( deletedEntry.key )
					}
				}, 60e3 )
			}

			constructor( cacheTimeout ){
				super()
				this.timeout = cacheTimeout
			}

			set( key, value ){
				const entry = super.get( key )

				if( entry ){
					entry.timeout = Date.now() + this.timeout
					entry.value = value
					TempCache.sortGlobal()
					return
				}

				const newEntry = new Entry({
					value,
					key,
					timeout: Date.now() + this.timeout,
					cache: this,
				})

				super.set( key, newEntry )
				TempCache.insertGlobal( newEntry )
			}

			get( key ){
				return super.get( key )
			}
		}

		// eslint-disable-next-line no-unused-vars
		function spawnAsync( program, args, options ){
			return new Promise( resolve => {
				const process = cp.spawn( program, args, options )
				let stdout = ''
				process.stdout.on( 'data', chunk => stdout += chunk )
				process.once( 'exit', code => resolve( code === 0 ? stdout : null ) )
			})
		}

		const utils = [
			// Discord CDN link fixer
			// async msg => {
			// 	const badURLs = msg.content.match( /https?:\/\/media\.discordapp\.net\/\S+\.(?:mp4|webm|mov)/gi )

			// 	if( badURLs && badURLs.length !== 0 )
			// 		return badURLs.map( url => url.replace( /^https?:\/\/media\.discordapp\.net/, 'https://cdn.discordapp.com' ) )
			// },

			// Twitter direct links provider
			// async ( msg, cache, react, suppressUserEmbeds ) => {
			// 	let links = [
			// 		/https?:\/\/(?:\w+\.)?(?:vx)?twitter\.com\/([^/\s]+)\/status\/(\d+)/gmi,
			// 	]
			// 		.map( re => Array.from( msg.content.matchAll( re ) ) )
			// 		.flat(1)

			// 	if( links.length === 0 )
			// 		return

			// 	react()

			// 	links = await Promise.all( links.map( async url => {
			// 		const key = url[1] + '/' + url[2]

			// 		if( cache.get( key ) )
			// 			return cache.get( key ).value

			// 		const directLinkPromise = ytdl( url[0], {
			// 			getUrl: true,
			// 			proxy,
			// 		})
			// 			.then( directLink => {
			// 				cache.set( key, directLink )
			// 				return directLink
			// 			})
			// 			.catch( () => {
			// 				cache.set( key, null )
			// 			})

			// 		cache.set( key, directLinkPromise )
			// 		return directLinkPromise
			// 	}))

			// 	return links
			// 		.map( url => url?.matchFirst( /https?\S+/ ) )
			// },

			// Reddit/TikTok files provider
			async ( msg, cache, react, suppressUserEmbeds ) => {
				let links = [
					// /https?:\/\/(?:\w+\.)?(reddit)\.com\/r\/(\S+)/gmi,
					/https?:\/\/(?:\w+\.)?(tiktok)\.com\/((?:@[-_\w]+\/)?[-_\w]+)/gmi,
					/https?:\/\/(?:\w+\.)?(instagram)\.com\/reel\/(\w+)/gmi,
				]
					.map( re => Array.from( msg.content.matchAll( re ) ) )
					.flat(1)

				if( links.length === 0 )
					return

				react()

				const urls = await Promise.all( links.map( async url => {
					const key = url[1] + '/' + url[2]

					const cached = cache.get( key )
					if( cached )
						return cached.value

					// const format = `webm`
					const flags = {
						// recodeVideo: format,
						formatSort: `codec:h264`,
						o: join( TEMP_FOLDER, `%(id)s.%(ext)s` ),
						proxy: getSocksProxy( 'yt-dlp' ),
					}

					const pathPromise = ytdl( url[0], {
						...flags,
						getFilename: true,
					})
						.then( async path => {
							await ytdl( url[0], flags )

							if( !fs.existsSync( path ) )
								return null

							const ziplineURL = await zipline.upload( path, {
								folderID: config.zipline.folderID,
							})
							cache.set( key, ziplineURL )
							fs.promises.unlink( path ).catch( () => {} )

							return ziplineURL
						})
						.catch( err => {
							cache.delete( key )
							throw err
						})

					cache.set( key, pathPromise )
					return pathPromise
				}))

				const validURLs = urls
					.map( paths => paths?.split( '\n' ) )
					.flat(1)
					.filter( s => !!s )

				if( validURLs.length > 0 ){
					suppressUserEmbeds()
				}

				return validURLs
			},
		]

		const caches = {}
		utils.forEach( ( _, i ) => caches[i] = new TempCache( CACHE_TIMEOUT ) )

		MM.pushHandler( 'link-utils', false, async msg => {
			if( msg.author.bot || msg.author.id === client.user.id )
				return

			const session = msg.response.session
			let reaction = null
			let suppress = false

			function react(){
				reaction ??= new Promise( resolve => {
					setImmediate( () => {
						resolve( msg.react( processing( '👌' ) ) )
					})
				})
			}

			function suppressUserEmbeds(){
				suppress = true
			}

			const files = []
			const embeds = []
			const content = await Promise
				.all( utils.map( ( util, i ) => util( msg, caches[i], react, suppressUserEmbeds ) ) )
				.then( links => links
					.flat(1)
					.filter( link => {
						if( !link )
							return false

						if( typeof link === 'object' ){
							embeds.push( link )
							return false
						}

						if( typeof link === 'string' && !link.toLowerCase().startsWith( 'http' ) ){
							files.push( link )
							return false
						}

						return true
					})
					.join( '\n' )
				)
				.then( s => s || null )
				.catch( async err => {
					await reaction
					await msg.reactions.removeAll()
					msg.react( '❌' )
					throw err
				})

			const hasSomething = content || files.length !== 0 || embeds.length !== 0

			if( hasSomething ) {
				await session.update({
					content,
					files,
					embeds,
				})
			}

			if( reaction ){
				await reaction
				msg.reactions.removeAll().catch( () => {} )
			}

			if( suppress ){
				msg.suppressEmbeds().catch( () => {} )
			}

			return hasSomething
		})
	}
}
