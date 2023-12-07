/* eslint-disable no-control-regex */
// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const cp = require( 'child_process' )
		const Embed = require( '@/functions/Embed' )
		const processing = require( '@/functions/processing' )
		const cb = require( '@/functions/cb' )

		const EXEC_TIMEOUT = 600e3

		async function callback({ args, session }){
			const string_command = args.getRaw()

			if( !string_command )
				return session.update( this.help )

			session.update( processing() )
			let timeout
			const ac = new AbortController()
			const cut = '\n...\n'

			function cropOutput( output, limit = 1024 ){
				if( output.length > limit ){
					const cb = output.matchFirst( /^```\n?/ ) || ''
					output = output.substring( output.length - limit + cb.length + cut.length + 1 )
					output = cb.replace( /\n/g, '' ) + cut + output.substring( output.indexOf( '\n' ) + 1 )
				}

				return output
			}

			function editMessage( error, stdout, stderr, finished = false ){
				const embeds = []

				if( stdout )
					embeds.push( Embed()
						.addFields({
							name: 'stdout:',
							value: cropOutput( cb( stdout.replace( /\u001b\[\??[\d+;]*\w/gi, '' ) ) )
						})
						.setColor( 0x80FF00 )
					)

				if( stderr )
					embeds.push( Embed()
						.addFields({
							name: 'stderr:',
							value: cropOutput( cb( stderr.replace( /\u001b\[\??[\d+;]*\w/gi, '' ) ) ),
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
				detached: true,
			}, async ( err, stdout, stderr ) => {
				clearTimeout( timeout )
				editMessage( err, stdout, stderr, true )
			})

			let stdout = '',
				stderr = '',
				stdChanged = false

			command.stdout.on( 'data', chunk => {
				stdout += chunk
				stdChanged = true
			})

			command.stderr.on( 'data', chunk => {
				stderr += chunk
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
					editMessage( null, stdout, stderr )
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
