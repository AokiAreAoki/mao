// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const client = require( '@/instances/client' )
		const MM = require( '@/instances/message-manager' )
		const cp = require( 'child_process' )
		const fs = require( 'fs' )
		const processing = require( '@/functions/processing' )
		const discord = require( 'discord.js' )
		const { join } = require( 'path' )
		const binarySearch = require( '@/functions/binarySearch' )

		const cacheTimeout = 2 * 24 * 3600e3

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
			async msg => {
				const badURLs = msg.content.match( /https?:\/\/media\.discordapp\.net\/\S+\.(?:mp4|webm|mov)/gi )

				if( badURLs && badURLs.length !== 0 )
					return badURLs.map( url => url.replace( /^https?:\/\/media\.discordapp\.net/, 'https://cdn.discordapp.com' ) )
			},

			// Twitter direct links provider
			async ( msg, cache, react ) => {
				let links = [
					/https?:\/\/(?:\w+\.)?twitter\.com\/([^/\s]+)\/status\/(\d+)/gmi,
				]
					.map( re => Array.from( msg.content.matchAll( re ) ) )
					.flat(1)

				if( links.length === 0 )
					return

				react()

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

				react()

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

			let immediate = null
			let reaction = null

			function react(){
				immediate ??= setImmediate( () => {
					reaction ??= msg.react( processing( '👌' ) )
				})
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

			clearImmediate( immediate )
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
