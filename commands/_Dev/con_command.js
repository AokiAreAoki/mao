module.exports = {
	requirements: 'client cp processing',
	init: ( requirements, mao ) => {
		requirements.define( global )

		const EXEC_TIMEOUT = 600e3

		async function callback( msg, args ){
			const string_command = args.get_string()

			if( !string_command )
				return this.sendHelp( msg )

			const message = await msg.send( processing() )
			const ac = new AbortController()
			let timeout
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
						.addField( 'stdout:', cropOutput( cb( stdout.replace( /\u001b\[\??[\d+;]*\w/gi, '' ) ) ) )
						.setColor( 0x80FF00 )
					)

				if( stderr )
					embeds.push( Embed()
						.addField( 'stderr:', cropOutput( cb( stderr.replace( /\u001b\[\??[\d+;]*\w/gi, '' ) ) ) )
						.setColor( 0xFF8000 )
					)

				const footer = ( () => {
					if( !finished )
						return `Executing...`

					if( !error )
						return `Done`

					if( error.code )
						return `Exit code: ${error.code}`

					return `Signal: ${error.signal}`
				})()

				const options = { embeds }

				if( finished )
					options.content = embeds.length === 0 ? `Nothing have been outputed\n${footer}` : null

				if( embeds.length !== 0 )
					embeds.at(-1).setFooter( footer )

				if( message.deleted )
					msg.send( options )
						.then( m => m.delete( 8e3 ) )
				else
					message.edit( options )
			}

			const command = cp.exec( args.get_string(), {
				timeout: EXEC_TIMEOUT,
				signal: ac.signal,
				detached: true,
			}, async ( err, stdout, stderr ) => {
				clearTimeout( timeout )
				editMessage( err, stdout, stderr, true )

				// const message = await message.send( `\`${args.get_string()}\` finished execution.` )
				// await new Promise( resolve => setTimeout( resolve, 3e3 ) )
				// message.delete( 8e3 )
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
				if( message.deleted )
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

		addCmd({
			aliases: 'con',
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
