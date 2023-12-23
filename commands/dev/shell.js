/* eslint-disable no-control-regex */
// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const cp = require( 'child_process' )
		const Embed = require( '@/functions/Embed' )
		const processing = require( '@/functions/processing' )
		const OutputBuffer = require( '@/re/output-buffer' )

		const EXEC_TIMEOUT = 600e3

		async function callback({ args, session }){
			const string_command = args.getRaw()

			if( !string_command )
				return session.update( this.help )

			session.update( processing() )

			let timeout = null
			let stdChanged = false
			const stdout = new OutputBuffer()
			const stderr = new OutputBuffer()
			const ac = new AbortController()

			function editMessage( error, finished = false ){
				const embeds = []

				if( stdout.output )
					embeds.push( Embed()
						.addFields({
							name: 'stdout:',
							value: stdout.getPretty(),
						})
						.setColor( 0x80FF00 )
					)

				if( stderr.output )
					embeds.push( Embed()
						.addFields({
							name: 'stderr:',
							value: stderr.getPretty(),
						})
						.setColor( 0xFF8000 )
					)

				const footer = ( !finished && `Executing...` )
					|| ( !error && `Done` )
					|| ( error.code && `Exit code: ${error.code}` )
					|| `Signal: ${error.signal}`

				const options = { embeds }

				if( finished )
					options.content = embeds.length === 0
						? `Nothing have been outputted\n${footer}`
						: null

				if( embeds.length !== 0 )
					embeds.at(-1).setFooter({ text: footer })

				session.update( options )
			}

			const command = cp.exec( args.getRaw(), {
				timeout: EXEC_TIMEOUT,
				signal: ac.signal,
			}, error => {
				clearTimeout( timeout )
				editMessage( error, true )
			})

			command.stdout.on( 'data', chunk => {
				stdout.pushChunk( chunk )
				stdChanged = true
			})

			command.stderr.on( 'data', chunk => {
				stderr.pushChunk( chunk )
				stdChanged = true
			})

			let nextMessageUpdate = 0
			const deadline = Date.now() + EXEC_TIMEOUT

			async function updateOutput(){
				if( session.isDeprecated )
					return ac.abort()

				if( stdChanged && nextMessageUpdate < Date.now() ){
					stdChanged = false
					nextMessageUpdate = Date.now() + 1.5e3
					editMessage()
				}

				if( deadline > Date.now() )
					timeout = setTimeout( updateOutput, 50 )
			}

			updateOutput()
		}

		addCommand({
			aliases: 'shell sh',
			description: {
				single: 'executes console command',
				usages: [
					['<console command...>', "executes $1. As if you'd type it in a real console."],
				],
			},
			callback,
		})
	}
}
