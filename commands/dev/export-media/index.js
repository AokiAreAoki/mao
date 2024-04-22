// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { join } = require( 'path' )
		const fs = require( 'fs' )
		const throttle = require( 'lodash/throttle' )

		const processing = require( '@/functions/processing' )
		const cb = require( '@/functions/cb' )
		const Embed = require( '@/functions/Embed' )

		const createMediaFetcherCoroutine = require( './media-fetcher' )
		const createSequentialDownloaderCoroutine = require( './sequential-downloader' )
		const createParallelDownloaderCoroutine = require( './parallel-downloader' )

		const TITLE = 'Exporting media'
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

				/** @type {MediaExportState} */
				const state = {
					fetchingDone: false,
					downloadingDone: false,
					messagesFetched: 0,
					mediaDownloaded: 0,
					totalMedia: 0,
					downloaders: [],
				}

				const updateStatus = throttle(() => {
					const { fetchingDone, downloadingDone, messagesFetched, mediaDownloaded, totalMedia } = state
					const done = fetchingDone && downloadingDone

					const status = [
						`${ state.fetchingDone ? 'Processed' : 'Processing' } ${ messagesFetched }/${ limit } messages`,
						`${ state.downloadingDone ? 'Downloaded' : 'Downloading' } ${ mediaDownloaded }/${ totalMedia } media`,
						`${ done ? 'Exported' : 'Exporting' } media to \`${ mediaPath }\``,
					].join( `\n` )

					return session.update( Embed()
						.setTitle( `${ done ? '✅' : processing('') } ${ TITLE }` )
						.setDescription( status )
						.setColor( done ? 0x80ff00 : 0xff8000 )
						.setFooter({ text: done ? `Done!` : `Processing...` })
					)
				}, 1337 )

				updateStatus()

				const mediaFetcherCoroutine = createMediaFetcherCoroutine({
					state,
					before: msg.id,
					channel: msg.channel,
					limit,
					mediaPath,
					onStatusUpdate: updateStatus,
				})

				const createDownloaderCoroutine = sequentialDownload
					? createSequentialDownloaderCoroutine
					: createParallelDownloaderCoroutine

				const downloaderCoroutine = createDownloaderCoroutine({
					state,
					onStatusUpdate: updateStatus,
				})

				await Promise.all([
					session.runSessionCoroutine( mediaFetcherCoroutine ),
					session.runSessionCoroutine( downloaderCoroutine ),
				])
					.catch( error => {
						console.error( error )
						session.update( Embed()
							.setTitle( `❌ ${ TITLE }` )
							.setDescription( cb( error.stack, 'js' ) )
							.setColor( 0xff0000 )
						)
					})

				return updateStatus()
			},
		})
	}
}