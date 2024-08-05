/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init(){
		const fs = require( 'fs' )
		const pathLib = require( 'path' )
		const discord = require( 'discord.js' )

		const client = require( '@/instances/client' )
		const bakadb = require( '@/instances/bakadb' )
		const { db } = bakadb
		const { iom, flags } = require( '@/index' )
		const MM = require( '@/instances/message-manager' )

		const cb = require( '@/functions/cb' )
		const Embed = require( '@/functions/Embed' )
		const transformMessagePayload = require( '@/functions/transformMessagePayload' )
		const processing = require( '@/functions/processing' )
		const printify = require( '@/re/printify' )

		const EvalFlagParser = require( './eval-flags-parser' )
		const formatEvaled = require( './format-evaled' )

		const EVAL_PREFIX = /^>>+\s*/i

		const evalFlagParser = new EvalFlagParser([
			'cb',
			'json',
			'prt',
			'del',
			'silent',
			'noparse',
			'iom',
			'dev',
			'whats',
			'keys',
			'dontawait',
			'file',
			'bin',
			'hex',
		])

		function findInclude( pathToFind ){
			const entities = pathToFind.split( /[/\\]+/ ).filter( e => !!e )
			const root = pathLib.dirname( require.main.filename )

			let path = entities.reduce( ( path, nextEntity, i ) => {
				if( i < entities.length - 1 && !fs.statSync( path ).isDirectory() )
					throw Error(
						`"@/${pathLib.relative( root, path )}" is not a folder`
						+ `\n  available folders:\n` + fs.readdirSync( path )
							.filter( f => fs.statSync(f).isDirectory() )
							.map( f => '  - ' + f )
							.join( '\n' )
					)

				const next = nextEntity.replace( /\W/g, '' ).toLowerCase()
				const entity = fs.readdirSync( path )
					.find( e => {
						if( e === 'mao.js' )
							return false

						if( e.replace( /\W/g, '' ).toLowerCase().search( next ) === -1 )
							return false

						if( i < entities.length - 1 && !fs.statSync( pathLib.join( path, e ) ).isDirectory() )
							return false

						return true
					})

				if( entity )
					return pathLib.join( path, entity )
				else
					throw Error(
						`nothing found at "@/${pathLib.relative( root, path )}/${nextEntity}"`
						+ `\n  ls:\n` + fs.readdirSync( path )
							.map( f => '  - ' + f )
							.join( '\n' )
					)
			}, root )

			return pathLib.relative( root, path ).replace( /\\/g, '/' )
		}

		MM.unshiftHandler( 'eval', true, async msg => {
			if( !( msg.author instanceof discord.User ) || !msg.author.isMaster() )
				return

			const session = msg.response.session
			const prefix = msg.content.matchFirst( EVAL_PREFIX )

			if( !prefix && !db.evalall?.[msg.author.id] )
				return

			const said = prefix ? msg.content.substring( prefix.length ) : msg.content
			const here = msg.channel
			const guild = here.guild
			const mem = msg.member
			const me = msg.author
			const ref = await msg.getReferencedMessage()
			const isOutputRequired = !!prefix

			const [rest, evalFlags] = evalFlagParser.parseAndCut( said )

			if( evalFlags.dev )
				evalFlags.iom = { value: 'dev' }

			if( evalFlags.iom && evalFlags.iom.value !== null ){
				if( evalFlags.iom.value !== iom && evalFlags.iom.value !== '*' )
					return
			} else if( flags.dev )
				return

			if( evalFlags.del )
				await msg.delete()

			// Extract the code from a code block
			let code = rest.matchFirst( /```(?:[\w+]+\s+)?(.+)```/s ) || rest

			try {
				if( isOutputRequired && !code.match( /\S/ ) )
					return

				const autoIncludedFiles = new Set()
				let __output = []
				let messageOptions = {
					content: null,
					embeds: [],
					files: [],
				}

				// eslint-disable-next-line no-inner-declarations
				function print( ...args ){
					__output.push( args
						.map( arg => String( arg ) )
						.join( '\t' )
					)
				}

				if( !evalFlags.noparse ){
					code = code
						.replace( /<@!?(\d+)>/gi, `( here.guild.members.cache.get('$1') || client.users.cache.get('$1') )` ) // Member || User
						.replace( /<#(\d+)>/gi, `client.channels.cache.get('$1')` ) // Channel
						.replace( /(<\w*:[\w_]+:(\d+)>)/gi, `client.emojis.resolve('$2','$1')` ) // Emoji
						.replace( /<@&(\d+)>/gi, `here.guild.roles.cache.get('$1')` ) // Role
						.replace( /@@((?:\/[\w-]+)+)/gi, ( match, path ) => {
							path = findInclude( path )
							autoIncludedFiles.add( '@/' + path )
							return `require("@/${path}")`
						})
						.replace( /@@([\w-]+)/gi, ( match, path ) => {
							path = findInclude( `node_modules/${path}` )
							autoIncludedFiles.add( '@/' + path )
							return `require("@/${path}")`
						})
				}

				let value = eval( code )

				if( !evalFlags.dontawait && value instanceof Promise ){
					session.update( processing( `Pending promise...` ) )
					value = await value
				}

				/** @type {string | object | null} */
				const response = formatEvaled({
					code,
					value,
					evalFlags,
					isOutputRequired,
					handleObject( value ){
						switch( value.constructor?.name ){
							case 'Embed':
							case 'EmbedBuilder':
							case 'Jimp': {
								const newOptions = transformMessagePayload( value )

								messageOptions = {
									...messageOptions,
									...newOptions,
									embeds: [
										...messageOptions.embeds,
										...newOptions.embeds,
									],
									files: [
										...messageOptions.files,
										...newOptions.files,
									],
								}

								return null
							}

							case 'Array':
								value = printify( value, 1 )
								break

							default:
								value = String( value )
								break
						}

						return value
					}
				})

				if( response && !evalFlags.cb && response.indexOf( '\n' ) !== -1 )
					evalFlags.cb = true

				if( autoIncludedFiles.size !== 0 )
					__output.unshift(
						'Included files:',
						...Array.from( autoIncludedFiles ),
						'',
					)

				const output = [...__output]

				if( !evalFlags.silent && response )
					output.push( response )

				messageOptions = {
					...messageOptions,
					content: output.join( '\n' ),
					cb: evalFlags.cb?.value || evalFlags.cb || __output.length !== 0,
				}

				if( evalFlags.file ){
					const attachment = new discord.AttachmentBuilder()
						.setName( 'output.txt' )
						.setFile( Buffer.from( messageOptions.content, 'utf8' ) )

					messageOptions = {
						...messageOptions,
						content: null,
						files: [...messageOptions.files, attachment],
					}
				}

				if( messageOptions.content || messageOptions.embeds.length !== 0 || messageOptions.files.length !== 0 ){
					msg.isCommand = true
					await session.update( messageOptions )

					return true
				}
			} catch( error ){
				if( isOutputRequired ){
					if( error )
						session.update( cb( error?.stack || error ) )
					else
						session.update( `OK, i caught the error but somewhat i've got ${error} instead of an actual error...` )

					return true
				}
			}
		})
	}
}
