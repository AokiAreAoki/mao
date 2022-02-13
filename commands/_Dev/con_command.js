module.exports = {
	requirements: 'client cp',
	init: ( requirements, mao ) => {
		requirements.define( global )

		async function callback( msg, args ){
			const string_command = args.get_string()

			if( !string_command )
				return this.sendHelp( msg )

			const loading = String( client.emojis.resolve( '822881934484832267' ) ?? 'Executing...' )
			const message = await msg.send( loading )
			const ac = new AbortController()
			let timeout

			const cut = '\n...\n'

			function std( std, limit = 1024 ){
				if( std.length > limit ){
					const cb = std.matchFirst( /^```\n?/ ) || ''
					std = std.substring( std.length - limit + cb.length + cut.length + 1 )
					std = cb.replace( /\n/g, '' ) + cut + std.substring( std.indexOf( '\n' ) + 1 )
				}

				return std
			}

			function editMessage( error, stdout, stderr, finished = false ){
				const embeds = [Embed()
					.addField( 'stdout:', stdout
						? cb( std( stdout.replace( /\u001b\[\??[\d+;]*\w/gi, '' ) ) )
						: '`nothing`'
					)
					.setColor( 0x80FF00 )
				]

				if( stderr )
					embeds.push( Embed()
						.addField( 'stderr:', cb( std( stderr.replace( /\u001b\[\??[\d+;]*\w/gi, '' ) ) ) )
						.setColor( 0xFF8000 )
					)

				const options = { embeds }

				if( finished )
					options.content = null

				const footer = ( () => {
					if( !finished )
						return `Executing...`

					if( !error )
						return `Done`

					if( error.code )
						return `Exit code: ${error.code}`

					return `Signal: ${error.signal}`
				})()

				embeds[embeds.length - 1].setFooter( footer )

				if( message.deleted )
					msg.send( options )
						.then( m => m.delete( 8e3 ) )
				else
					message.edit( options )
			}

			const command = cp.exec( args.get_string(), {
				timeout: 60e3,
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

			async function updateOutput(){
				if( message.deleted )
					return ac.abort()

				if( stdChanged && nextMessageUpdate < Date.now() ){
					stdChanged = false
					nextMessageUpdate = Date.now() + 1.2e3
					editMessage( null, stdout, stderr )
				}

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
