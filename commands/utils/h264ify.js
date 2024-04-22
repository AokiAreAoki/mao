// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { mkdirSync } = require( 'fs' )
		const { join, resolve } = require( 'path' )
		const cp = require( 'child_process' )
		const ffmpegPath = require( 'ffmpeg-static' )
		const tempPath = require( '@/instances/temp-folder' )
		const OutputBuffer = require( '@/re/output-buffer' )
		const Embed = require( '@/functions/Embed' )
		const processing = require( '@/functions/processing' )

		const EXEC_TIMEOUT = 120e3

		addCommand({
			aliases: 'h264ify h264',
			description: {
				single: 're-encodes a video to h264',
			},
			async callback({ msg, session }){
				const url = await msg.findLastVideo()

				if( !url )
					return session.update( 'No videos were found' )

				session.update( Embed().setDescription( processing( 'Encoding...' ) ) )

				const outputFolderPath = join( resolve( tempPath ) )
				const outputPath = join( outputFolderPath, Date.now().toString(36) + '.mp4' )
				const args = [
					'-i', url,
					'-c:v', 'libx264',
					'-c:a', 'aac',
					outputPath,
					'-y',
				]

				mkdirSync( outputFolderPath, { recursive: true } )

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