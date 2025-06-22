
// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { mkdirSync } = require( 'fs' )
		const { join, resolve } = require( 'path' )
		const cp = require( 'child_process' )
		const ffmpegPath = require( 'ffmpeg-static' )
		const Embed = require( '@/functions/Embed' )
		const processing = require( '@/functions/processing' )
		const downloadURL = require( '@/functions/download-url' )
		const { Permissions } = require( '@/constants/perms' )
		const tempPath = require( '@/constants/temp-folder' )
		const OutputBuffer = require( '@/re/output-buffer' )

		const EXEC_TIMEOUT = 120e3

		addCommand({
			aliases: 'h264ify h264',
			description: {
				single: 're-encodes a video to h264',
			},
			async callback({ msg, session }){
				if( !msg.author.hasPerm( Permissions.H264IFY ) )
					return session.update( `Access to this command is restricted due to high load on server` )

				const url = await msg.findRecentVideo()

				if( !url )
					return session.update( 'No videos were found' )

				const tempFolderPath = join( resolve( tempPath ) )
				const uniqueId = Date.now().toString(36)
				const inputPath = join( tempFolderPath, `input-${uniqueId}.mp4` )
				const outputPath = join( tempFolderPath, `output-${uniqueId}.mp4` )

				session.update( Embed()
					.setDescription( processing( '...' ) )
					.setFooter({ text: 'Downloading...' })
				)

				const success = await downloadURL( url, inputPath )

				if( !success )
					return session.update( 'Failed to download the file :(' )

				session.update( Embed()
					.setDescription( processing( '...' ) )
					.setFooter({ text: 'Encoding...' })
				)

				const args = [
					'-i', inputPath,
					'-c:v', 'libx264',
					'-c:a', 'aac',
					outputPath,
					'-y',
				]

				mkdirSync( tempFolderPath, { recursive: true } )

				let interval = null
				let exitCode = null

				const ffmpeg = cp.spawn( ffmpegPath, args, { timeout: EXEC_TIMEOUT } )
				const output = new OutputBuffer()

				ffmpeg.stdout.on( 'data', chunk => {
					output.pushChunk( chunk )
				})

				ffmpeg.stderr.on( 'data', chunk => {
					output.pushChunk( chunk )
				})

				function updateSession(){
					session.update( Embed()
						.setColor( exitCode == null ? 0xFF8000 : 0xFF0000 )
						.setAuthor({
							name: msg.author.username,
							iconURL: msg.author.avatarURL(),
						})
						.setDescription( output.getPretty() )
						.setFooter({ text: exitCode == null ? 'Executing...' : `Process exited with code ${exitCode}` })
					)
				}

				function stop(){
					clearInterval( interval )
					ffmpeg.kill()
				}

				interval = setInterval( () => {
					if( session.isCanceled ){
						stop()
						return
					}

					updateSession()
				}, 1337 )

				ffmpeg.once( 'close', code => {
					exitCode = code
					stop()

					if( code === 0 )
						session.update({ files: [outputPath] })
					else
						updateSession()
				})
			},
		})
	}
}