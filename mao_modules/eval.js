/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const fs = require( 'fs' )
		const pathlib = require( 'path' )
		const discord = require( 'discord.js' )
		const bakadb = require( '@/instances/bakadb' )
		const client  = require( '@/instances/client' )
		const { db } = bakadb
		const { iom, flags } = require( '@/index' )
		const MM = require( '@/instances/message-manager' )
		const cb = require( '@/functions/cb' )
		const numsplit = require( '@/functions/numsplit' )
		const processing = require( '@/functions/processing' )
		const includeFiles = require( '@/functions/includeFiles' )
		const printify = require( '@/re/printifier' )
		const Response = require( '@/re/response' )

		let evalPrefix = /^>>+\s*/i

		class EvalFlagsParser {
			constructor( flags ){
				this.flags = new Set( flags )
			}

			parseAndCutFirstFlag( code ){
				let flag = null, value = null

				code.matchFirst( /^\s*([A-Za-z]+)(?:[\s:])/, matched => {
					matched = matched.toLowerCase()

					if( this.flags.has( matched ) ){
						flag = matched
						code = code.trimLeft().substring( flag.length )

						if( code[0] === ':' ){
							value = code.matchFirst( /^.([\w*]+)/ ) ?? ''
							code = code.substring( value.length + 1 )
						}
					}
				})

				return [code, flag, value]
			}

			parseAndCut( code ){
				let flag, value,
					flags = {}

				// eslint-disable-next-line no-constant-condition
				while( true ){
					[code, flag, value] = this.parseAndCutFirstFlag( code )

					if( !flag )
						break

					flags[flag] = { value }
				}

				return [code, flags]
			}
		}

		const evalFlagsParser = new EvalFlagsParser([
			'cb',
			'prt',
			'del',
			'silent',
			'noparse',
			'iom',
			'dev',
			'whats',
			'keys',
			'dontawait',
		])

		function findInclude( pathToFind ){
			const entities = pathToFind.split( /[/\\]+/ ).filter( e => !!e )
			const root = pathlib.dirname( require.main.filename )

			let path = entities.reduce( ( path, nextEntity, i ) => {
				if( i < entities.length - 1 && !fs.statSync( path ).isDirectory() )
					throw Error(
						`"@/${pathlib.relative( root, path )}" is not a folder`
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

						if( i < entities.length - 1 && !fs.statSync( pathlib.join( path, e ) ).isDirectory() )
							return false

						return true
					})

				if( entity )
					return pathlib.join( path, entity )
				else
					throw Error(
						`nothing found at "@/${pathlib.relative( root, path )}/${nextEntity}"`
						+ `\n  ls:\n` + fs.readdirSync( path )
							.map( f => '  - ' + f )
							.join( '\n' )
					)
			}, root )

			return pathlib.relative( root, path ).replace( /\\/g, '/' )
		}

		MM.unshiftHandler( 'eval', true, async msg => {
			let ismaster = msg.author instanceof discord.User && msg.author.isMaster()

			if( ismaster ){
				let said = msg.content
				let here = msg.channel
				let mem = msg.member
				let me = msg.author
				let prefix = said.matchFirst( evalPrefix )
				let ref = await msg.getReferencedMessage()

				const response = new Response( msg )

				if( prefix )
					said = said.substring( prefix.length )
				else if( !db.evalall?.[msg.author.id] )
					return

				let [code, evalFlags] = evalFlagsParser.parseAndCut( said )

				if( evalFlags.dev )
					evalFlags.iom = { value: 'dev' }

				if( evalFlags.iom && evalFlags.iom.value !== null ){
					if( evalFlags.iom.value !== iom && evalFlags.iom.value !== '*' )
						return
				} else if( flags.dev )
					return

				if( evalFlags.del )
					await msg.delete()

				code.matchFirst( /```(?:[\w+]+\s+)?(.+)```/s, it => code = it )

				let __printerr = !!prefix
				let abortHandlersQueue = false
				let abortHQ = () => abortHandlersQueue = true

				try {
					if( __printerr && !code.match( /\S/ ) )
						return

					let evaled
					let __output = ''
					let autoIncludedFiles = []

					// eslint-disable-next-line no-inner-declarations
					function print( ...args ){
						if( __output )
							__output += '\n'

						args.forEach( ( v, k ) => {
							if( k > 0 ) __output += '\t'
							__output += String( v )
						})
					}

					if( !evalFlags.noparse ){
						code = code
							.replace( /<@!?(\d+)>/gi, `( here.guild.members.cache.get('$1') || client.users.cache.get('$1') )` ) // Member || User
							.replace( /<#(\d+)>/gi, `client.channels.cache.get('$1')` ) // Channel
							.replace( /(<\w*:[\w_]+:(\d+)>)/gi, `client.emojis.resolve('$2','$1')` ) // Emoji
							.replace( /<@&(\d+)>/gi, `here.guild.roles.cache.get('$1')` ) // Role
							.replace( /@@((?:\/[\w-]+)+)/gi, ( match, path ) => {
								path = findInclude( path )
								autoIncludedFiles.push( '@/' + path )
								return `require("@/${path}")`
							})
							.replace( /@@([\w-]+)/gi, ( match, path ) => {
								path = findInclude( `node_modules/${path}` )
								autoIncludedFiles.push( '@/' + path )
								return `require("@/${path}")`
							})
					}

					evaled = eval( code )

					if( !evalFlags.dontawait && evaled instanceof Promise ){
						await response.update( processing( `Pending promise...` ) )
						evaled = await evaled
					}

					const doPrint = !!( () => {
						if( evalFlags.whats ){
							let type = typeof evaled

							if( type === 'object' ){
								if( evaled == null )
									type = 'a null'
								else
									type = `an ${type}, instance of ${evaled.constructor.name}`
							} else if( type !== 'undefined' )
								type = 'a ' + type

							evaled = type
							return true
						}

						if( evalFlags.keys ){
							if( evaled == null ){
								evaled = `\`${String( evaled )}\` has no keys`
								return true
							}

							evaled = Object.keys( evaled ).join( '` `' )
							evaled = evaled ? `keys: \`${evaled}\`` : 'no keys'
							evalFlags.prt = false
							return true
						}

						if( evalFlags.prt ){
							evaled = `.: ${printify( evaled, evalFlags.prt.value || 3 )}`
							return true
						}

						if( evalFlags.silent )
							return false

						switch( typeof evaled ){
							case 'undefined':
								evaled = 'undefined'
								return __printerr

							case 'boolean':
							case 'bigint':
							case 'symbol':
								evaled = String( evaled )
								if( !__printerr && !evalFlags.cb && code === evaled )
									return
								break

							case 'number':
								if( !__printerr && !evalFlags.cb && /^[+-]?([\w_]+|(\d+)?(\.\d+)?(e\d+)?)$/i.test( code ) )
									return
								evaled = numsplit( evaled )
								break

							case 'string':
								if( !__printerr && !evalFlags.cb && code[0] === code[code.length - 1] && '"\'`'.search( code[0] ) + 1 )
									if( code.substring( 1, code.length - 1 ) === evaled )
										return
								break

							case 'object':
								if( !__printerr )
									return

								if( evaled === null ){
									evaled = 'null'
									return true
								}

								switch( evaled.constructor?.name ){
									case 'Embed':
									case 'EmbedBuilder':
									case 'Jimp':
										response.update( evaled )
										return

									case 'Array':
										evaled = printify( evaled, 1 )
										break

									default:
										evaled = String( evaled )
										break
								}
								break

							case 'function': {
								let funcBody = String( evaled )
								let indent = funcBody.matchFirst( /\n(\s+)[^\n]+$/ )

								if( indent ){
									indent = ( indent.match( /\t/g )?.length ?? 0 ) + ( indent.match( /\s{4}/g )?.length ?? 0 )
									funcBody = funcBody.replace( new RegExp( `^(\\t|[^\\t\\S]{4}){${indent}}`, 'gm' ), '' )
								}

								evaled = funcBody
								evalFlags.cb = { value: 'js' }
								break
							}

							default:
								evaled = `Result parse error: unknown type "${typeof evaled}" of evaled`
								break
						}

						return true
					})()

					if( doPrint ){
						if( typeof evaled !== 'string' )
							return
						else if( !evalFlags.cb && evaled.indexOf( '\n' ) !== -1 )
							evalFlags.cb = true
					}

					if( autoIncludedFiles.length !== 0 )
						__output = `Included files:\n${autoIncludedFiles.join( '\n' )}\n${__output}`

					if( __output && !evalFlags.silent ){
						if( doPrint )
							print( evaled )

						response.update( cb( __output ) )
						msg.isCommand = true
					} else if( doPrint ){
						if( !evalFlags.cb && !msg.member.permissions.has( discord.PermissionsBitField.Flags.EmbedLinks ) )
							evaled = evaled.replace( /(https?:\/\/\S+)/g, '<$1>' )

						await response.update( evalFlags.cb ? cb( evaled, evalFlags.cb.value ) : evaled )
						msg.isCommand = true
						return abortHQ()
					}

					return abortHQ()
				} catch( err ){
					if( __printerr ){
						if( err )
							response.update( cb( err?.stack ) )
						else
							response.update( `OK, i caught the error but somewhat i've got ${err} instead of error...` )

						return abortHQ()
					}
				}

				return abortHandlersQueue
			}
		})
	}
}