// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const fs = require( 'fs' )
		const { join, extname } = require( 'path' )
		const axios = require( 'axios' )
		const proxyAgent = require( '@/instances/proxyAgent' )
		const processing = require( '@/functions/processing' )

		const DEFAULT_MESSAGE_LIMIT = 100
		const DEFAULT_PATH = process.platform === 'win32'
			? './media-exports'
			: '~/media-exports'

		addCommand({
			aliases: 'export-media',
			flags: [
				[`path`, `<path>`, `specifies export path (default: \`${ DEFAULT_PATH }\`)`],
				[`limit`, `<count>`, `specifies the number of messages to export (default: ${ DEFAULT_MESSAGE_LIMIT })`],
				[`sequential`, `downloads media sequentially (by default downloads in parallel)`],
			],
			description: {
				single: 'exports media from a channel',
				usages: [
					[`exports media from the current channel to ${ DEFAULT_PATH }`],
					['<path>', `exports media from the current channel to $1`],
				],
			},
			async callback({ msg, args, session }){
				const rootPath = args.flags.path[0] || DEFAULT_PATH
				const limit = parseInt( args.flags.limit[0] ) || DEFAULT_MESSAGE_LIMIT
				const sequentialDownload = args.flags.sequential.specified

				const guildPath = join( rootPath, msg.guild.id )
				const channelPath = join( guildPath, msg.channel.id )
				const mediaPath = join( channelPath, 'media' )

				fs.mkdirSync( mediaPath, { recursive: true } )

				let done = false
				let fetchedMessages = 0
				let downloadedMedia = 0
				let totalDownloads = 0
				let lastMessageId = msg.id

				function updateStatus(){
					const status = [
						done ? `Done!` : `Fetching media... ${ processing('') }`,
						!done && `Downloading media... ${ downloadedMedia }/${ totalDownloads }`,
						`Processed ${ fetchedMessages + downloadedMedia }/${ limit } messages`,
						`${ done ? 'Exported' : 'Exporting' } media to \`${ mediaPath }\``,
					]
						.filter( Boolean )
						.join( `\n` )

					return session.update( status )
				}

				updateStatus()

				while( fetchedMessages < limit ){
					const chunkLimit = Math.min( limit - fetchedMessages, 100 )
					const messages = await msg.channel.messages
						.fetch({
							limit: chunkLimit,
							before: lastMessageId,
						})
						.then( collection => collection.toArray() )

					const medias = messages.map( getMedia ).flat()
					await downloadURLs( medias, mediaPath, sequentialDownload, ( downloaded, total ) => {
						downloadedMedia = downloaded
						totalDownloads = total
						updateStatus()
					})

					fetchedMessages += messages.length

					if( messages.length < chunkLimit )
						break

					updateStatus()

					lastMessageId = messages.at(-1).id
				}

				downloadedMedia = 0
				totalDownloads = 0
				done = true
				updateStatus()
			},
		})

		/**
		 * @typedef {Object} Media
		 * @property {string} url
		 * @property {string} filename
		 */

		/**
		 * @param {import('discord.js').Message} msg
		 * @returns {Media[]}
		 */
		function getMedia( msg ){
			const existingFilenames = new Set()

			/**
			 * @param {import('discord.js').Message} msg
			 * @param {string} url
			 * @returns {string}
			 */
			function getName( msg, url ){
				const filename = msg.id + '_' + url.split( '/' ).pop().split( '?' )[0]

				if( !existingFilenames.has( filename ) ){
					existingFilenames.add( filename )
					return filename
				}

				const extension = extname( filename )
				const name = filename.slice( 0, -extension.length )
				let newFilename
				let index = 0

				do {
					newFilename = `${ name }_${ ++index }${ extension }`
				} while( existingFilenames.has( newFilename ) )

				existingFilenames.add( newFilename )
				return newFilename
			}

			return [
				...( msg.content?.match( /(https?:\/\/\S+\.(jpe?g|png|webp|gif|bmp))/gi ) || [] ),
				...msg.attachments
					.filter( a => a.contentType.indexOf( 'image' ) !== -1 )
					.map( a => a?.url ),
				...msg.embeds
					.filter( e => !!e.image )
					.map( e => e?.image?.url ),
			]
				.filter( url => !!url )
				.map( url => {
					const filename = getName( msg, url )

					return { url, filename }
				})
		}

		/**
		 * @param {Media[]} medias
		 * @param {string} path
		 * @param {boolean} sequential
		 * @returns {Promise<void>}
		 */
		async function downloadURLs( medias, path, sequential, onStatusUpdate ){
			let count = 0

			if( !sequential )
				return Promise.all( medias.map( async url => {
					const result = await downloadURL( url, path )

					onStatusUpdate?.( ++count, medias.length )

					return result
				}))

			return medias.reduce( async ( accumulator, media ) => {
				const results = await accumulator

				results.push( await downloadURL( media, path ) )
				onStatusUpdate?.( ++count, medias.length )

				return results
			}, Promise.resolve([]) )
		}

		/**
		 * @param {Media} media
		 * @param {string} path
		 * @returns {Promise<void>}
		 */
		async function downloadURL( media, path ){
			return axios.get( media.url, {
				responseType: 'stream',
				httpAgent: proxyAgent(),
				httpsAgent: proxyAgent(),
			})
				.then( response => {
					const filePath = join( path, media.filename )
					const stream = response.data.pipe( fs.createWriteStream( filePath ) )

					return new Promise( resolve => {
						stream.once( 'finish', () => {
							resolve(true)
						})

						stream.once( 'error', error => {
							console.error( error )
							resolve(false)
						})
					})
				})
				.catch( error => {
					console.error( error )
					return false
				})
		}
	}
}