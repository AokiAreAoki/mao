const log = console.log

// Including modules
let requireAndLog = module => {
	let match = module.match( /^([^\/]+)\/([^\/]+)$/ )
	let mod

	if( match ){
		log( `    Requiring "${match[2]}" from "${match[1]}" module...` )
		mod = require( match[1] )

		if( typeof mod === 'undefined' || !mod )
			log( `        Failed to require "${match[1]}" module.` )
		else {
			mod = mod[match[2]]
			if( typeof mod === 'undefined' || !mod )
				log( `        Failed to require "${match[2]}" from "${match[1]}" module.` )
		}
	} else {
		log( `    Requiring "${module}" module...` )
		mod = require( module )

		if( typeof mod === 'undefined' || !mod )
			log( `        Failed to require "${module}" module.` )
	}

	return mod
}

log( 'Requiring modules:' )
const fs = requireAndLog( 'fs' )
const http = requireAndLog( 'http' )
const https = requireAndLog( 'https' )
const join = requireAndLog( 'path/join' )
const cp = requireAndLog( 'child_process' )
const discord = requireAndLog( 'discord.js' )
const ytdl = requireAndLog( 'ytdl-core-discord' )
const jimp = requireAndLog( 'jimp' )
const vm = requireAndLog( 'vm' )
const tgb = requireAndLog( 'node-telegram-bot-api' )
const req = require( 'request' )
log()

// Including my modules
let re = module => {
	log( `    Requiring "${module}" module...` )
	return require( `./re/${module}.js` )
}

log( 'Requiring custom modules:' )
const tree = re( 'tree-printer' )
const bakadb = re( 'bakadb' )
const timer = re( 'timer' )
const vec = re( 'vector' )
const List = re( 'List' )
const waitFor = re( 'waitFor' )
const { Booru } = re( 'booru-wrapper' )( req )
//const MyLang = re( 'MyLang' )
log()

// Defining some shit
const maoclr = 0xF2B066
const write = fs.writeFileSync
const readdir = fs.readdirSync
let clamp = ( num, min, max ) => num < min ? min : num > max ? max : num

const _tkns = JSON.parse( read( './tokens.json' )
	.replace( /\/\/.+?\n/g, '' )	// removes comments from the file 'cuz JSON.parse can't ignore them. baka.
	.replace( /,[\n\s]+}/g, '}' )	// removes trailing commas
)

const Gelbooru = new Booru({
	//url: 'https://gelbooru.com/index.php',
	url: 'https://aoki.000webhostapp.com/glbr/search/',
	name: 'gelbooru.com',
	qs: {
		// tags keyword is "tags" by default
		page: 'pid',
		// limit keyword is "limit" by default
	},
	const_qs: {
		page: 'dapi',
		s: 'post',
		q: 'index',
		json: '1',
		token: _tkns.booru_proxy,
	},
	limit: 100,
	keys: {
		id: ( post, pic ) => {
			pic.id = post.id
			pic.post_url = 'https://gelbooru.com/index.php?page=post&s=view&id=' + pic.id
		},
		score: '',
		// sample_url: 'sample',
		// file_url: 'full',
		file_url: ( post, pic ) => {
			pic.hasSample = post.sample == 1
			pic.full = post.file_url
			pic.sample = pic.hasSample
				? pic.full.replace( /\/images\/((\w+\/)+)(\w+\.\w+)/, '/samples/$1sample_$3' )
				: pic.full
		}
	},
	remove_other_keys: true,
})

const Yandere = new Booru({
	//url: 'https://yande.re/post.json',
	url: 'https://aoki.000webhostapp.com/yndr/search/',
	name: 'yande.re',
	qs: {
		// tags keyword is "tags" be default
		// page keyword is "page" by default
		// limit keyword is "limit" by default
	},
	const_qs: {
		token: _tkns.booru_proxy,
	},
	limit: 100,
	keys: {
		id: ( post, pic ) => {
			pic.id = post.id
			pic.post_url = 'https://yande.re/post/show/' + pic.id
		},
		score: '',
		file_url: 'full',
		sample_url: 'sample',
	},
	remove_other_keys: true,
})

function process_exit( code ){
	process.exit( typeof code == 'undefined' || isNaN( code ) ? 0 : code )
}

function charka( charOrNumber ){ // Converts number to char and vice versa
	if( typeof charOrNumber === 'number' )
		return String.fromCharCode( charOrNumber )
	else if( typeof charOrNumber === 'string' )
		return charOrNumber.charCodeAt()
	return null
}

function numsplit( num ){
	return String( num ).replace( /(\.|,)?\d+/g, ( match, comma, i, num ) =>
		match.replace( /\B/g, ( _, i ) => ( match.match( /^\d/ ) ? match.length - i : i - 1 ) % 3 === 0 ? ' ' : '' ) )
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

function cb( text ){
	return '```\n' + text + '```'
}

let __duplicates,
	tabstr = amount => ' '.repeat( amount * 4 )

function tts( table, maxtab=4, tab=0 ){
	let isarray = table && table.constructor == Array
	
	if( tab >= maxtab )
		return ( isarray ? '[ ... ]' : '{ ... }' ) + '\n'
	
	if( typeof table != 'object' )
		return `here's ur ${typeof table} for u:\n	${String( table )}`
	
	let str = ''
	
	if( tab === 0 )
		__duplicates = []
	
	++tab
	
	for( var k in table ){
		if( typeof table[k] == 'object' ){
			if( table[k] !== null ){
				if( __duplicates.includes( table[k] ) ){
					str += 'Duplicate of ' + table[k].constructor.name
					continue
				} else
					__duplicates.push( table[k] )
			}
			
			str += `${tabstr(tab) + k}: ${tts( table[k], maxtab, tab )}`
		} else {
			if( isarray && !k.match( /^[0-9]*$/ ) )
				continue
			
			switch( typeof table[k] ){
				case 'string':
					var val = `"${table[k]}"`
					break
				
				case 'function':
					//var val = String( table[k] ).split( '{' )[0] + '{ ... }'
					var val = String( table[k] ).replace( /^((async\s+)?(.+?=>\s*|function\s*[\w_]*\(.*?\)\s*))\{.*\}$/, '$1{ ... }' )
					break

				default:
					var val = table[k]
					break
			}

			str = str + tabstr( tab ) + k + `: ${val}\n`
		}
	}
	
	str = str ? '{\n' + str + tabstr( tab - 1 ) : '{'
	--tab
	
	if( tab === 0 ){
		__duplicates = []
		return str + '}'
	}
	
	return str + '}\n'
}

function instanceOf( object, constructorName ){
	return typeof object === 'object' && object !== null && object.constructor.name === constructorName
}

function findMem( guild, name ){
	let members = ( guild.constructor.name == 'Guild' ? guild : guild.guild ).members.cache.array()
	
	if( typeof name == 'string' )
		name = name.toLowerCase()
	
	for( let i = 0; i < members.length; i++ ){
		let m = members[i]
		
		if( m.nickname && m.nickname.toLowerCase().search( name ) !== -1 || m.user.username.toLowerCase().search( name ) !== -1 )
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
const client = new discord.Client({
	messageCacheLifetime: 1200,
	messageSweepInterval: 72,
})

if( !db.token || !_tkns.discord[db.token] )
	for( let k in _tkns.discord ){
		db.token = k
		break
	}

client.login( _tkns.discord[db.token] )

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

client.once( 'ready2', () => {
    log( 'Logged in as ' + client.user.tag )
    
    /// Here goes custom shit after bot fully initialized ///
    
    // Handling waitFor
    unshiftMessageHandler( 'waitFor', waitFor.handler )
})

// Message handlers
messageHandlers = []
function addMessageHandler( description, callback ){
	if( callback ) callback.description = description
	else callback = description
	messageHandlers.push( callback )
}

function unshiftMessageHandler( description, callback ){
	if( callback ) callback.description = description
	else callback = description
	messageHandlers.unshift( callback )
}

async function handleMessage( msg, edited ){
	msg._answers = []
	for( let i = 0; i < messageHandlers.length; ++i ){
		let stop = await messageHandlers[i]( msg, edited || false )
		
		// Debugger
		//log( String( messageHandlers[i].description ) + ' :: ' + String( !!stop ) )
		
		if( stop ) break
	}
}

client.on( 'message', handleMessage )
client.on( 'messageUpdate', ( oldMsg, newMsg ) => {
	if( typeof oldMsg._answers === 'object' && oldMsg._answers.constructor === Array && oldMsg.content !== newMsg.content ){
	    let waiter = waitFor.waiters[oldMsg.member.id]
	    if( waiter ) waiter.cancel()
	    
		oldMsg.channel.bulkDelete( oldMsg._answers )
		handleMessage( newMsg, true )
	}
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
	delete inclusion
	delete requirements
}

// Including functions
log( 'Including functions:' )
readdir( './functions' ).forEach( file => {
	if( file.endsWith( '.js' ) ){
		log( `    Including "${file}"...` )
		include( './' + join( './functions', file ) )
	}	
})
log()

// Command manager
_prefix = /^(-|(mao|мао)\s+)/i
cmddata = {
	prefix: _prefix,
	modules: {},
	cmds: {},
}

// Custom prefix if logged in as MaoDev#2638
client.on( 'ready', () => {
	if( client.user.id == '598593004088983688' )
		cmddata.prefix = /^(--\s*)/i
	else
		cmddata.prefix = new RegExp( `^(-|(mao|мао|<@!?${client.user.id}>)\\s+)`, 'i' )
})

function addCmd( module, command, description, callback ){
	let m = module.toLowerCase()
	let aliases = command.split( /\s+/ )
	let cmd = aliases.shift()
	
	cmddata.cmds[cmd] = {
		module: m,
		aliases: aliases,
		description: typeof description === 'string'
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
tree( 'Including commands:', ( print, fork ) => {
	readdir( './commands' ).forEach( module => {
		fork( `Module "${module}":`, print => {
			readdir( './' + join( 'commands', module ) ).forEach( file => {
				if( file.endsWith( '.js' ) ){
					print( `File "${file}"...` )
					include( './' + join( 'commands', module, file ), {
						addCmd: ( aliases, description, callback ) => addCmd( module, aliases, description, callback )
					})
				}
			})
		})
	})
	print( '' )
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
unshiftMessageHandler( 'commands', ( msg, edited ) => {
	if( msg.author.id == client.user.id || msg.author.bot ) return
	let prefix = msg.content.matchFirst( cmddata.prefix )

	if( prefix ){
		let string_args = msg.content.substring( prefix.length ),
			cmd = string_args.matchFirst( /^\S+/i ).toLowerCase()
		
		if( cmddata.cmds[cmd] ){
			string_args = string_args.substring( cmd.length ).trim()
			let string_cmd = cmd

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
			
			if( cmd.module === 'dev' && !msg.member.isMaster() )
				return

			// Parsing arguments
			let args = [],
				args_pos = []
			parseArgs( string_args, args, args_pos )
			args[-1] = string_cmd

			function get_string_args( number=0 ){
				return typeof args_pos[number] == 'number' ? string_args.substring( args_pos[number] ) : ''
			}
			get_string_args.args_pos = args_pos

			if( cmd.func instanceof Function )
				cmd.func( msg, args, get_string_args )
			else
				log( `Error: cmddata.cmds.${cmd}.func is a ${typeof cmd.func}, function expected` )
			
			return true
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
let eval_prefix = /^>>+\s*/i

client.on( 'ready', () => {
	eval_prefix = new RegExp( `^(>>+|<@!?${client.user.id}>)\\s*`, 'i' )
})

unshiftMessageHandler( 'eval', async ( msg, edited ) => {
	let ismaster = msg.author instanceof discord.User && msg.author.isMaster()

	/// TODO: Sandbox
	/// TODO: Fix eval

	if( ismaster || ( sandboxenabled && allowJSGuilds.includes( msg.guild.id ) && !msg.author.bot ) ){
		let said = msg.content,
			here = msg.channel,
			me = msg.author,
			ec = said.match( eval_prefix )

		if( ec )
			ec = ec[0]
		else {
			if( !smarteval ) return
			ec = ''
		}
		
		let code = said.substring( ec.length )
		//if( code.match( // ) ) return true
		
		let checktag = true

		while( checktag ){
			let tag = code.match( /^\s*([A-Za-z]+)(?=[\s\n```])/ )
			if( !tag ) break

			switch( tag[1].toLowerCase() ){
				case 'cb':
					code = code.substring( tag[0].length )
					var __printcb = true
					break

				case 'tts':
					code = code.substring( tag[0].length )
					var __printtts = true
					break

				case 'del':
				   code = code.substring( tag[0].length )
				   var __deletmsg = true
				   break

				case 'silent':
				   code = code.substring( tag[0].length )
				   var __silent = true
				   break

				case 'sb':
				   code = code.substring( tag[0].length )
				   var __sbox = true
				   break

				default:
					checktag = false
					break
			}
		}
		
		if( __deletmsg ) await msg.delete()

		let cbstart = code.match( /^\s*```[a-zA-Z0-9]*/ )
		let cbend = code.match( /```.*?$/ )

		if( cbstart && cbend )
			code = code.substring( cbstart[0].length, code.length - cbend[0].length )

		let __printerr = ec.length > 0
		let abortHandlersQueue = false
		let abortHQ = () => abortHandlersQueue = true

		try {
			if( __printerr && !code.match( /\S/ ) ){
				return
				//msg.send( 'Gimme code baka~!' )
				//return abortHQ()
			}

			//let fs = "sosni ka"
			let evaled, __output = ''
			
			if( ismaster && !__sbox ){
				let print = ( ...args ) => {
					if( __output ) __output += '\n'

					args.forEach( ( v, k ) => {
						if( k > 0 ) __output += '\t'
						__output += String( v )
					})
				}

				if( /<@!?(\d+)>/i.test( code ) ) // User
					code = code.replace( /<@!?(\d+)>/gi, `here.guild.members.cache.get('$1')` )

				if( /<#(\d+)>/i.test( code ) ) // Channel
					code = code.replace( /<#(\d+)>/gi, `here.guild.channels.cache.get('$1')` )

				if( /<:[\w_]+:(\d+)>/i.test( code ) ) // Emojis
					code = code.replace( /<:[\w_]+:(\d+)>/gi, `here.guild.emojis.cache.get('$1')` )
				
				if( /<@&(\d+)>/i.test( code ) ) // Roles
					code = code.replace( /<@&(\d+)>/gi, `here.guild.roles.cache.get('$1')` )

				evaled = await eval( code )
			} else {
				/*let script = new vm.Script( code, {
					filename: 'sandbox.js',
					timeout: 30e3,
				})*/

				sandbox.msg = msg.content
				sandbox.print = ( ...args ) => {
					if( __output ) __output += '\n'

					args.forEach( ( v, k ) => {
						if( k > 0 ) __output += '\t'
						__output += String( v )
					})
				}

				evaled = vm.runInContext( code, sandbox, { filename: 'sandbox.js', timeout: 3e3 } )
			}

			if( __silent ) return abortHQ()

			let printEvaled = ( () => {
				if( typeof evaled != 'undefined' || __printerr ){
					if( __printtts ){
						if( typeof evaled !== 'object' ){
							//msg.sendcb( `TTSError: object expected, got ${typeof evaled}` )
							//return false
							evaled = `hm... doesn't looks like a table or an array but ok\nhere's ur *${typeof evaled}* for u: ${String( evaled )}`
						} else
							evaled = `here's ur ${evaled.constructor === Array ? 'array' : 'table'} for u: ${tts( evaled )}`
					} else {
						switch( typeof evaled ){
							case 'undefined': 
								evaled = 'undefined'
								break

							case 'number':
								if( !__printerr && !__printcb && code === String( evaled ) ) return false
								evaled = numsplit( evaled )
								break

							case 'string':
								if( !__printerr && !__printcb && code[0] === code[code.length - 1] && '"\'`'.search( code[0] ) + 1 )
									if( code.substring( 1, code.length - 1 ) === evaled )
										return false
								break

							case 'object':
								if( !__printerr ) return false
								break
								
							case 'function':
								evaled = '```JS\n' + String( evaled ) + '```'
								var __printcb = false
								break
						   }
					}
					
					if( typeof evaled == 'object' ){
						if( evaled === null ){
							evaled = 'null'
						} else {
							switch( evaled.constructor.name ){
								case 'MessageEmbed':
									__printcb = false
									break

								case 'Jimp':
									evaled.getBuffer( jimp.AUTO, ( err, buffer ) => {
										if( err ) msg.sendcb( err )
										else msg.send( { files: [buffer] } )
									})

									return false
									break

								default:
									evaled = String( evaled )
									break
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
						if( __output ) msg.sendcb( __output )
						if( typeof evaled == 'string' && !__printcb && !msg.member.hasPermission( discord.Permissions.FLAGS.EMBED_LINKS ) )
							evaled = evaled.replace( /(https?:\/\/[\w/#%@&$?=+.,:;]+)/, '<$1>' )

						msg.send( __printcb ? cb( evaled ) : evaled )
							.catch( err => msg.sendcb( err ) )
						return abortHQ()
					} 
				} 

				if( __output ) msg.sendcb( __output )
			} catch( err ){
				msg.sendcb( err )
			}
			
			return abortHQ()
		} catch( err ){
			if( __printerr ){
				msg.sendcb( err )
				return abortHQ()
			}
		}

		return abortHandlersQueue
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