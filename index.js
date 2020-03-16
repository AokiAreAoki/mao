// Including modules
const fs = require( 'fs' )
const http = require( 'http' )
const https = require( 'https' )
const join = require( 'path' ).join
const discord = require( 'discord.js' )
const ytdl = require( 'ytdl-core' )
const vm = require( 'vm' )

// Including my modules
var re = module => require( `./re/${module}.js` )
const tree = re( 'tree-printer' )
const bakadb = re( 'bakadb' )
const timer = re( 'timer' )
const vec = re( 'vector' )
const List = re( 'List' )

// Defining some shit
const maoclr = 0xF2B066
const log = console.log
const write = fs.writeFileSync
const readdir = fs.readdirSync

function process_exit( code ){
	process.exit( typeof code == 'undefined' || isNaN( code ) ? 0 : code )
}

function numsplit( num ){
	return String( num ).replace( /(\.|,)?\d+/g, ( match, comma, i, num ) =>
		match.replace( /\B/g, ( _, i ) => ( match.match( /^\d/ ) ? match.length - i : i - 1 ) % 3 == 0 ? ' ' : '' ) )
}

function read( path ){
	return fs.readFileSync( path ).toString()
}

function embed(){
	return new discord.MessageEmbed().setColor( maoclr )
}

String.prototype.matchFirst = function( re ){
	let matched = this.match( re )
	if( matched ) return matched[1] || matched[0]
}

function findMem( guild, name ){
    let members = ( guild.constructor.name == 'Guild' ? guild : guild.guild ).members.cache.array()
    
    if( typeof name == 'string' )
        name = name.toLowerCase()
    
    for( let i = 0; i < members.length; i++ ){
        let m = members[i]
        
        if( m.displayName.toLowerCase().match( name ) )
            return m
	}
	
	return null
}

function httpGet( url, callback, errfunc ){
    if( !errfunc ) errfunc = () => {}
    let protocol
    
    if( url.startsWith( 'http' ) ) protocol = http
    if( url.startsWith( 'https' ) ) protocol = https
    if( !protocol ) return 'Wrong protocol'
    
    protocol.get( url, resp => {
        let data = ''
        resp.on( 'data', chunk => data += chunk )
        resp.on( 'end', () => {
            if( typeof callback == 'function' )
				try {
					callback( data )
				} catch( err ){
					errfunc( err )
				}
        })
    }).on( 'error', errfunc )
}

// Initializing BakaDB
bakadb.init({
	List: List,
})
bakadb.autoSave( 3600 / 2 )
db = bakadb.db

bakadb.on( 'missing-encoder', encoder => log( `[WARNING] Missing "${encoder}" encoder` ) ) 
bakadb.on( 'missing-decoder', decoder => log( `[WARNING] Missing "${decoder}" decoder` ) ) 

// Creating client
const client = new discord.Client()
client.login( read( './token' ).replace( /[\r\n].*/, '' ) )

var isOnlineOrInitialized = false
client.once( 'ready', () => {
	if( isOnlineOrInitialized ){
		delete isOnlineOrInitialized
		client.emit( 'ready2' )
	} else
		isOnlineOrInitialized = true

	lch = client.channels.cache.get( '334675361482670080' )
	
	client.on( 'ready', () => {
		log( "I'm back" )
		lch = client.channels.cache.get( '334675361482670080' )
	})
})

client.once( 'ready2', () => log( 'Logged in as ' + client.user.tag ) )

// Message handlers
messageHandlers = []
function addMessageHandler( callback ){
	messageHandlers.push( callback )
}

client.on( 'message', async msg => {
	for( let i = 0; i < messageHandlers.length; i++ )
		if( await messageHandlers[i]( msg ) ) break;
})

// Includer
function include( path, overwrites ){
	let inclusion = require( path )
	let requirements = {}

	inclusion.requirements.split( /\s+/ ).forEach( variable => {
		if( variable ) requirements[variable.replace( /\./g, '_' )] = eval( variable )
	})

	if( inclusion.evaluations )
		for( let k in inclusion.evaluations )
			requirements[k] = eval( inclusion.evaluations[k] )

	if( typeof overwrites == 'object' )
		for( let k in overwrites )
			requirements[k] = overwrites[k]
	
	requirements.define = local_global => {
		for( let k in requirements )
			local_global[k] = requirements[k]
	}

	inclusion.execute( requirements, global )
}

// Including functions
readdir( './functions' ).forEach( file => {
	if( file.endsWith( '.js' ) )
		include( './' + join( './functions', file ) )
})

// Command manager
cmddata = {
	prefix: /^(-|(mao|мао)\s+)/i,
	//prefix: /^(--\s*)/i,
	modules: {},
	cmds: {},
}

// Custom prefix if logged in as MaoDev#2638
client.once( 'ready2', () => {
	if( client.user.id == '598593004088983688' )
		cmddata.prefix = /^(--\s*)/i
})

function addCmd( module, command, description, callback ){
	let m = module.toLowerCase()
	let aliases = command.split( /\s+/ )
	let cmd = aliases.shift()
	
	cmddata.cmds[cmd] = {
		module: m,
		aliases: aliases,
		description: typeof description == 'string'
			? { short: description, full: description }
			: description,
		func: callback,
	}

	if( aliases.length > 0 )
		aliases.forEach( alias => cmddata.cmds[alias] = cmd )

	if( cmddata.modules[m] )
		cmddata.modules[m].cmds.push( cmd )
	else {
		cmddata.modules[m] = {
			printname: module,
			cmds: [cmd]
		}
	}
}

// Including commands
tree( 'Including commands...', ( print, fork ) => {
	readdir( './commands' ).forEach( module => {
		fork( `Module "${module}"...`, print => {
			readdir( join( './commands', module ) ).forEach( file => {
				if( file.endsWith( '.js' ) ){
					print( `File "${file}"...` )
					include( './' + join( './commands', module, file ), {
						addCmd: ( aliases, description, callback ) => addCmd( module, aliases, description, callback )
					})
				}
			})
		})
	})
})

function parseArgs( string_args, args, args_pos ){
	let arg = '', pos = 0, quotes = ''

	for( let i = 0; i < string_args.length; ++i ){
		let char = string_args[i]

		if( !quotes && /\s/.test( char ) ){
			if( arg ){
				args.push( arg )
				args_pos.push( pos )
				arg = ''
			}
		} else {
			if( quotes ){
				if( char == quotes ){
					args.push( arg )
					args_pos.push( pos )
					arg = ''
					quotes = ''
					continue
				}
			} else {
				if( char == '"' || char == "'" ){
					quotes = char
					pos = i
					continue
				}
			}

			if( !arg && !quotes ) pos = i
			arg += char
		}
	}
	
	if( arg ){
		args.push( arg )
		args_pos.push( pos )
	}
}

// Command handler
addMessageHandler( msg => {
	if( msg.author.id == client.user.id ) return
	let prefix = msg.content.matchFirst( cmddata.prefix )

	if( prefix ){
		let string_args = msg.content.substring( prefix.length )
		let cmd = string_args.matchFirst( /^\S+/i ).toLowerCase()
		
		if( cmddata.cmds[cmd] ){
			string_args = string_args.substring( cmd.length ).trim()
			
			/* Aliases Redirection
			 * Example:
			 *	commands = {
			 *		...
			 *		ping: ( ... ) => { ... },
			 *		pong: 'ping',
			 *		...
			 *	}
			 */
			if( typeof cmddata.cmds[cmd] == 'string' )
				cmd = cmddata.cmds[cmd]
			
			cmd = cmddata.cmds[cmd]

			// Parsing arguments
			let args = [], args_pos = []
			parseArgs( string_args, args, args_pos )

			function get_string_args( number=0 ){
				return typeof args_pos[number] == 'number' ? string_args.substring( args_pos[number] ) : ''
			}
			get_string_args.args_pos = args_pos

			if( typeof cmd.func == 'function' )
				cmd.func( msg, args, get_string_args )
			else
				log( `Error: cmddata.cmds.${cmd}.func is a ${typeof cmd.func}, function expected` )
		}
	}
})

// Sandbox for eval
sandboxenabled = false
sandbox = vm.createContext({
    vec: vec,
})

// Eval
let smarteval = true

addMessageHandler( async msg => {
	let ismaster = msg.member.isMaster()

	/// TODO: Sandbox
	/// TODO: Fix eval

	if( ismaster || ( sandboxenabled && allowJSGuilds.includes( msg.guild.id ) && !msg.author.bot ) ){
		let said = msg.content
		let here = msg.channel
		let ec = said.match( /^>>+\s*/i )

		if( ec )
			ec = ec[0]
		else {
			if( !smarteval ) return;
			ec = ''
		}
		
		let code = said.substring( ec.length )
		//if( code.match( // ) ) return;
		
		let checktag = true

		while( checktag ){
			let tag = code.match( /^\s*[A-Za-z]+(?=[\s\n(```)])/ )

			if( !tag ){
				checktag = false
				break
			}
				
			let sub = tag[0]
			tag = sub.match( /[A-Za-z]+/ )[0]

			switch( tag.toLowerCase() ){
				case 'cb':
					code = code.substring( sub.length )
					var __printcb = true
					break;

				case 'tts':
					code = code.substring( sub.length )
					var __printtts = true
					break;

				case 'del':
				   code = code.substring( sub.length )
				   var __deletmsg = true
				   break;

				case 'silent':
				   code = code.substring( sub.length )
				   var __silent = true
				   break;

				case 'sb':
				   code = code.substring( sub.length )
				   var __sbox = true
				   break;

				default:
					checktag = false
					break;
			}
		}
		
		if( __deletmsg ) await msg.delete();

		let cbstart = code.match( /^\s*```[a-zA-Z0-9]*/ )
		let cbend = code.match( /```.*?$/ )

		if( cbstart && cbend ){
			code = code.substring( cbstart[0].length, code.length - cbend[0].length )
		}

		let __printerr = ec.length > 0

		try {
			if( __printerr && !code.match( /\S/ ) ){
				here.send( 'Gimme code baka~!' )
				return
			}

			//let fs = "sosni ka"
			let evaled, __output = '';
			
			if( ismaster && !__sbox ){
				let print = ( ...args ) => {
					if( __output ) __output += '\n';

					args.forEach( ( v, k ) => {
						if( k > 0 ) __output += '\t'
						__output += String( v )
					})
				}
				
				evaled = await eval( code )
			} else {
				/*let script = new vm.Script( code, {
					filename: 'sandbox.js',
					timeout: 30e3,
				})*/

				sandbox.msg = msg.content
				sandbox.print = ( ...args ) => {
					if( __output ) __output += '\n';

					args.forEach( ( v, k ) => {
						if( k > 0 ) __output += '\t'
						__output += String( v )
					})
				}

				evaled = vm.runInContext( code, sandbox, { filename: 'sandbox.js', timeout: 3e3 } )
			}

			if( __silent ) return;

			let printEvaled = ( () => {
				if( typeof evaled != 'undefined' || __printerr ){
					if( __printtts ){
						if( typeof evaled != 'object' ){
							here.sendcb( `TTSError: object expected, got ${typeof evaled}` )
							return false
						}

						evaled = "here's ur table for u: " + tabletostring( evaled )
					} else {
						switch( typeof evaled ){
							case 'undefined': 
								evaled = 'undefined'
								break;

							case 'number':
								if( code === String( evaled ) && !__printerr && !__printcb ) return false;
								evaled = numsplit( evaled );
								break;

							case 'object':
								if( !__printerr ) return false;
								break;
								
							case 'function':
								evaled = '```JS\n' + String( evaled ) + '```'
								var __printcb = false
								break;
						   }
					}
					
					if( typeof evaled == 'object' ){
						if( evaled === null ){
							evaled = 'null'
						} else {
							switch( evaled.constructor.name ){
								case 'MessageEmbed':
									__printcb = false;
									break;

								case 'Jimp':
									evaled.getBuffer( jimp.AUTO, ( err, buffer ) => {
										if( err ) here.sendcb( err )
										else here.send( { files: [buffer] } )
									})

									return false
									break;

								default:
									evaled = String( evaled )
									break;
							}
						}
					}

					return true
				}

				return false
			})()

			try {
				if( printEvaled ){
					if( __output && typeof evaled != 'object' ){
						__output += '\n' + String( evaled )
					} else {
						if( __output ) here.sendcb( __output )
						if( typeof evaled == 'string' && !__printcb && !msg.member.hasPermission( discord.Permissions.FLAGS.EMBED_LINKS ) )
							evaled = evaled.replace( /(https?:\/\/[\w/#%@&$?=+.,:;]+)/, '<$1>' )

						here.send( __printcb ? cb( evaled ) : evaled )
							.catch( err => here.sendcb( err ) )
						return
					} 
				} 

				if( __output ) here.sendcb( __output )
			} catch( err ){
				here.sendcb( err )
			}
			
			return
		} catch( err ){
			if( __printerr ){
				here.sendcb( err )
				return
			}
		}
	}
})

// Say "done" after including all
if( isOnlineOrInitialized ){
	delete isOnlineOrInitialized
	log( "I'm already online and finished initialization!" )
	client.emit( 'ready2' )
} else {
	isOnlineOrInitialized = true
	log( "Initialization finished, logging in..." )
}
