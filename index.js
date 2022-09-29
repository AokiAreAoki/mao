const startedAt = Date.now()
const log = console.log
const __flags = {}
let __iom = 'mao'

function logw( text ){
	return process.stdout.write( String( text ) )
}

/// Some custom methods
require( './methods' )

{ //////////  Simple flag parser  //////////
	const flagCallbacks = {
		flags(){
			log( 'List of all flags:' )
			log( Object.keys( flagCallbacks )
				.map( f => `  --${f}` )
				.join( '\n' )
			)
			process.exit( 228 ) // full exit code
		},
		dev(){
			__iom = 'dev'
		},
	}
	let noFlags = true

	process.argv.slice(2).forEach( arg => {
		if( !arg.startsWith( '--' ) )
			return

		let flagname = arg.substring(2).toLowerCase()
		const callback = flagCallbacks[flagname]

		if( callback ){
			__flags[flagname] = true
			noFlags = false

			if( typeof callback === 'function' )
				callback()

			return
		}

		throw new Error( `Unknown flag "${arg}". Run Mao with "--flags" flag to see all flags` )
	})

	if( noFlags )
		log( `Running Mao with no flags` )
	else
		log( `Running Mao with next flags: ${Object.keys( __flags ).join( ', ' )}` )

	log()
}

//////////  Including modules  //////////
logw( 'Requiring modules...' )
	const fs = require( 'fs' )
	const { join } = require( 'path' )
	const cp = require( 'child_process' )
	const Jimp = require( 'jimp' )

	const http = require( 'http' )
	const https = require( 'https' )
	const req = require( 'request' ) // deprecated
	const axios = require( 'axios' )
	const discord = require( 'discord.js' )
	const Collection = discord.Collection
	//const tgb = require( 'node-telegram-bot-api' )

	const ytdl = require( 'ytdl-core-discord' )
		  ytdl.search = require( 'ytsr' )

	const kym = require( 'nodeyourmeme' )
	const pet = require( 'pet-pet-gif' )
log( 'OK' )

// Including my modules
logw( 'Requiring custom modules...' )
	const bakadb = require( './re/bakadb' )
	const CommandManager = require( './re/command-manager' )
	const Booru = require( './re/booru-wrapper' )( axios )
	const TimeSplitter = require( './re/time-splitter' )
	const List = require( './re/list' )
	const MessageManager = require( './re/message-manager' )
	//const MyLang = require( './re/MyLang' )
	const NH = new ( require( 'nhentai-api' ) ).API()
	const Paginator = require( './re/paginator' )
	const printify = require( './re/printifier' )
	const SauceNAO = require( './re/saucenao-wrapper' )
	const timer = require( './re/timer' )
	const tree = require( './re/tree-printer' )
	const vec = require( './re/vector' )
log( 'OK' )

// Defining some shit
const write = fs.writeFileSync
const readdir = fs.readdirSync
const clamp = ( num, min, max ) => num < min ? min : num > max ? max : num

// Getting config
function updateConfig(){
	config = JSON.parse( read( './config.json' )
		.replace( /[^:]\/\/.+$/gm, '' )	// removes comments 'cuz JSON is retarded
		.replace( /,[\n\s]+}/g, '}' )	// removes trailing commas 'cuz JSON is retarded
	)
}
updateConfig()

// Getting tokens
if( !fs.existsSync( './tokens.json' ) ){
	log( '\nFile "tokens.json" does not exists, exit.' )
	process.exit( 228 )
}

const _tkns = JSON.parse( read( './tokens.json' )
	.replace( /\/\/.+?\n/g, '' )	// removes comments 'cuz JSON is retarded
	.replace( /,[\n\s]+}/g, '}' )	// removes trailing commas 'cuz JSON is retarded
)

// Booru wrappers
Booru.BooruResponse.prototype.embed = function( pics, mapFunction = null ){
	if( typeof pics === 'number' )
		pics = this.results[pics]

	if( !( pics instanceof Array ) )
		pics = [pics]

	const videos = []
	const embeds = pics.map( pic => {
		if( pic.unsupportedExtention )
			videos.push( pic.full )

		return Embed()
			.setDescription( `[${this.tags ? 'Tags: ' + this.tags : 'No tags'}](${pic.post_url})` )
			.setImage( pic.sample )
			.setFooter( 'Powered by ' + ( this.booru.name ?? 'unknown website' ) )
	})

	if( mapFunction instanceof Function )
		embeds.forEach( mapFunction )

	return {
		content: videos.join( '\n' ) || null,
		embeds,
	}
}

const Gelbooru = new Booru({
	...config.boorus.gelbooru,
	keys: {
		id: ( post, pic, tags ) => {
			tags = tags.replace( /\s+/g, '+' )
			pic.id = post.id
			pic.post_url = `https://gelbooru.com/index.php?page=post&s=view&id=${pic.id}&tags=${tags.replace( /\)/g, '%29' )}`
		},
		score: '',
		file_url: ( post, pic ) => {
			pic.hasSample = post.sample == 1
			pic.sample = post.file_url
			pic.full = post.file_url

			if( /\.(jpe?g|png|gif|bmp)$/i.test( pic.full ) ){
				pic.sample = pic.hasSample && !pic.full.endsWith( '.gif' )
					? pic.full.replace( /\/images\/((\w+\/)+)(\w+\.)\w+/, '/samples/$1sample_$3jpg' )
					: pic.full
			} else
				pic.unsupportedExtention = pic.full.matchFirst( /\.(\w+)$/i ).toUpperCase()
		}
	},
	remove_other_keys: false,
})
Gelbooru.const_params.api_key = _tkns.gelbooru.api_key
Gelbooru.const_params.user_id = _tkns.gelbooru.user_id

const Yandere = new Booru({
	...config.boorus.yandere,
	keys: {
		id: ( post, pic ) => {
			pic.id = post.id
			pic.post_url = 'https://yande.re/post/show/' + pic.id
		},
		score: '',
		file_url: 'full',
		sample_url: 'sample',
		created_at: ( post, pic ) => pic.created_at = post.created_at * 1000
	},
	remove_other_keys: false,
})

// Boorus' proxy access token
//Gelbooru.const_params._token = _tkns.booru_proxy
//Yandere.const_params._token = _tkns.booru_proxy

// SauceNAO wrapper
const sauce = new SauceNAO( axios, {
	output_type: 2,
	api_key: _tkns.saucenao,
	db: 999,
	numres: 10,
	dedupe: 0,
	// hide: 0,
	// testmode: 1,
})

//////////  Some Functions  //////////

async function _exit( code ){
	if( typeof code !== 'number' && code != null )
		return false

	if( code == null )
		code = 0

	bakadb.save( true )
	await client.destroy()

	code = isFinite( code ) ? Math.floor( code ) : NaN
	process.exit( isNaN( code ) ? 0 : code )
}

function max( a, b ){
	return a > b ? a : b
}

function min( a, b ){
	return a < b ? a : b
}

function numsplit( num ){
	return String( num ).replace( /(\.|,)?\d+/g, ( match, comma, i, num ) =>
		match.replace( /\B/g, ( _, i ) => ( match.match( /^\d/ ) ? match.length - i : i - 1 ) % 3 === 0 ? ',' : '' ) )
}

function read( path ){
	return fs.readFileSync( path ).toString()
}

function Embed(){
	return new discord.MessageEmbed().setColor( config.maoclr )
}

function cb( text, lang = '' ){
	return '```' + lang + '\n' + text + '```'
}




	}

}

function instanceOf( object, constructorName ){
	return typeof object === 'object' && object !== null && object.constructor.name === constructorName
}

const htmlEntities = {
	nbsp: ' ',
	quot: '\"',
	amp: '&',
	lt: '<',
	gt: '>',
}

function decodeHTMLEntities( string ){
	return string
		.replace( /&#(\d+);/g, ( m, d ) => String.fromCharCode(d) )
		.replace( /&(nbsp|amp|quot|lt|gt);/g, ( m, e ) => htmlEntities[e] )
}

function httpGet( options, callback, errcallback ){
	const promise = new Promise( ( resolve, reject ) => {
		let protocol, url = options.path ?? options

		if( url.startsWith( 'https' ) )
			protocol = https
		else if( url.startsWith( 'http' ) )
			protocol = http
		else
			return reject( 'Wrong protocol' )

		protocol.get( options, resp => {
			let data = ''
			resp.on( 'data', chunk => data += chunk )
			resp.on( 'end', () => resolve( data ) )
			resp.on( 'error', reject )
		}).on( 'error', reject )
	})

	if( typeof callback === 'function' )
		promise.then( callback )

	if( typeof errcallback === 'function' )
		promise.catch( errcallback )

	return promise
}

//////////  Initializing BakaDB  //////////
bakadb.init( __flags.dev ? './test/bdb' : './bdb', {
	List: List,
})
bakadb.autoSave( 5*60 )
db = bakadb.db

bakadb.on( 'missing-encoder', encoder => log( `[WARNING] Missing "${encoder}" encoder` ) )
bakadb.on( 'missing-decoder', decoder => log( `[WARNING] Missing "${decoder}" decoder` ) )

//////////  Creating client  //////////
const client = new discord.Client({
	restRequestTimeout: 60e3,
	makeCache: discord.Options.cacheWithLimits({
		MessageManager: {
			sweepInterval: 300,
			sweepFilter: discord.LimitedCollection.filterByLifetime({
				lifetime: 3600*4,
				getComparisonTimestamp: e => e.editedTimestamp ?? e.createdTimestamp,
			}),
		},
		ThreadManager: {
			sweepInterval: 3600,
			sweepFilter: discord.LimitedCollection.filterByLifetime({
				getComparisonTimestamp: e => e.archiveTimestamp,
				excludeFromSweep: e => !e.archived,
			}),
		},
	}),
	intents: [
		'GUILDS',
		//'GUILD_MEMBERS',
		//'GUILD_BANS',
		//'GUILD_EMOJIS',
		'GUILD_INTEGRATIONS',
		//'GUILD_WEBHOOKS',
		//'GUILD_INVITES',
		'GUILD_VOICE_STATES',
		//'GUILD_PRESENCES',
		'GUILD_MESSAGES',
		'GUILD_MESSAGE_REACTIONS',
		//'GUILD_MESSAGE_TYPING',
		'DIRECT_MESSAGES',
		'DIRECT_MESSAGE_REACTIONS',
		//'DIRECT_MESSAGE_TYPING',
	],
})

client.login( _tkns.discord[__flags.dev ? 'dev' : 'mao'] )
	.catch( err => {
		console.error( err )
		log( 'Failed to log in. Exit.' )
		process.exit(2)
	})

let isOnlineOrInitialized = false

client.on( 'error', err => {
	log( 'Client error happaned:' )
	log( err )
})

client.once( 'ready', () => {
	if( isOnlineOrInitialized ){
		delete isOnlineOrInitialized
		loginTime = Date.now() - loginTime
		client.emit( 'ready2' )
	} else
		isOnlineOrInitialized = true

	lch = client.channels.cache.get( '721667351648403507' )

	client.on( 'ready', () => {
		log( "I'm back" )
		lch = client.channels.cache.get( '721667351648403507' )
	})

	const URs = {} // Unhandled Rejections

	function sendUnhandledRejection( rejection ){
		const ur = String( rejection )

		client.channels.fetch( config['log-channel'] )
			.then( channel => {
				URs[ur].messagePromise?.then( m => m.delete() )
				URs[ur].messagePromise = channel.send( Embed()
					.addField( `Unhandled rejection: (x${URs[ur].time})`, cb( rejection.stack ) )
				)
			})
			.catch( () => log( '`log-channel` is not specified or not found' ) )
	}

	process.on( 'unhandledRejection', async rejection => {
		if( rejection.message === 'Unknown Message' )
			return

		log( 'Unhandled rejection:', rejection.stack )

		if( !config['log-channel'] )
			return log( '`log-channel` is not specified or not found' )

		const ur = String( rejection )

		if( URs[ur] ){
			++URs[ur].time
		} else {
			URs[ur] = {
				time: 1,
				nextMessage: 0,
			}
		}

		if( URs[ur].timeout )
			return

		sendUnhandledRejection( rejection )
		const time = URs[ur].time

		URs[ur].timeout = setTimeout( () => {
			URs[ur].timeout = null

			if( time !== URs[ur].time )
				sendUnhandledRejection( rejection )
		}, 3e3 )
	})
})

client.on( 'messageDelete', msg => {
	msg.deleted = true
})

client.once( 'ready2', () => {
	/// Here the bot is fully initialized ///

	log( 'Logged in as ' + client.user.tag )
})

function processing( alt = 'Loading...' ){
	return String( client.emojis.resolve( '822881934484832267' ) ?? alt )
}

//////////  Initializing Paginator  //////////
Paginator.init( discord, client )

//////////  Message handlers  //////////
const MM = new MessageManager({
	discord,
	client,
	handleEdits: true,
	handleDeletion: true,
})

//////////  Include function  //////////
function include( path, overwrites ){
	let inclusion = require( path )
	let requirements = {}

	inclusion.requirements?.split( /\s+/ ).forEach( variable => {
		if( variable != null )
			requirements[variable.replace( /\./g, '_' )] = eval( variable )
	})

	if( inclusion.evaluations )
		for( let k in inclusion.evaluations )
			requirements[k] = eval( inclusion.evaluations[k] )

	if( overwrites instanceof Object )
		for( let k in overwrites )
			requirements[k] = overwrites[k]

	requirements.define = local_global => {
		for( let k in requirements )
			local_global[k] = requirements[k]
	}

	if( typeof inclusion.init === 'function' )
		inclusion.init( requirements, global )
	else
		console.warn( `Failed to include "${path}". Init function isn't a function or doesn't exist` )

	delete inclusion
	delete requirements
}

//////////  Including functions  /////
logw( 'Including functions...' )
	readdir( './functions' ).forEach( file => {
		if( file.endsWith( '.js' ) ){
			const path = './' + join( 'functions', file )

			try {
				include( path )
			} catch( err ){
				log( `\n    Failed to include "${path}" file` )
				throw err
			}
		}	
	})
log( 'OK' )

//////////  Eval  //////////
let eval_prefix = /^>>+\s*/i

class EvalFlagsParser {
	constructor( flags ){
		this.flags = new List( flags )
	}

	parseAndCutFirstFlag( code ){
		let flag = null, value = null

		code.matchFirst( /^\s*([A-Za-z]+)(?:[\s:])/, matched => {
			matched = matched.toLowerCase()

			if( this.flags[matched] ){
				flag = matched
				code = code.trimLeft().substring( flag.length )

				if( code[0] === ':' ){
					value = code.matchFirst( /^.([\w\*]+)/ ) ?? ''
					code = code.substring( value.length + 1 )
				}
			}
		})

		return [code, flag, value]
	}

	parseAndCut( code ){
		let flag, value,
			flags = {}

		do {
			[code, flag, value] = this.parseAndCutFirstFlag( code )
			if( !flag ) break
			flags[flag] = { value }
		} while( true )

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
	'ref',
])

MM.unshiftHandler( 'eval', true, async msg => {
	let ismaster = msg.author instanceof discord.User && msg.author.isMaster()

	if( ismaster ){
		let said = msg.content
		let here = msg.channel
		let mem = msg.member
		let me = msg.author
		let prefix = said.matchFirst( eval_prefix )
		let ref = msg.getReferencedMessage()

		if( prefix )
			said = said.substring( prefix.length )
		else if( !db.evalall?.[msg.author.id] )
			return

		let [code, evalflags] = evalFlagsParser.parseAndCut( said )

		if( evalflags.dev )
			evalflags.iom = { value: 'dev' }

		if( evalflags.ref )
			ref = await ref

		if( evalflags.iom && evalflags.iom.value !== null ){
			if( evalflags.iom.value !== __iom && evalflags.iom.value !== '*' )
				return
		} else if( __flags.dev )
			return

		if( evalflags.del )
			await msg.delete()

		code.matchFirst( /```(?:[\w\+]+\s+)?(.+)```/s, it => code = it )

		let __printerr = !!prefix
		let abortHandlersQueue = false
		let abortHQ = () => abortHandlersQueue = true

		try {
			if( __printerr && !code.match( /\S/ ) )
				return

			let evaled, __output = ''

			function print( ...args ){
				if( __output )
					__output += '\n'

				args.forEach( ( v, k ) => {
					if( k > 0 ) __output += '\t'
					__output += String( v )
				})
			}

			function say( ...args ){
				return msg.send( ...args )
			}

			if( !evalflags.noparse ){
				code = code
					.replace( /<@!?(\d+)>/gi, `( here.guild.members.cache.get('$1') || client.users.cache.get('$1') )` ) // Member || User
					.replace( /<#(\d+)>/gi, `client.channels.cache.get('$1')` ) // Channel
					.replace( /(<\w*:[\w_]+:(\d+)>)/gi, `client.emojis.resolve('$2','$1')` ) // Emoji
					.replace( /<@&(\d+)>/gi, `here.guild.roles.cache.get('$1')` ) // Role
			}

			evaled = evalflags.dontawait
				? eval( code )
				: await eval( code )

			const printEvaled = !!( () => {
				if( evalflags.whats ){
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

				if( evalflags.keys ){
					if( evaled == null ){
						evaled = `\`${String( evaled )}\` has no keys`
						return true
					}

					evaled = Object.keys( evaled ).join( '` `' )
					evaled = evaled ? `keys: \`${evaled}\`` : 'no keys'
					evalflags.prt = false
					return true
				}

				if( evalflags.prt ){
					evaled = typeof evaled === 'object'
						? evaled = `here's ur ${evaled.constructor === Array ? 'array' : 'table'} for u: ${printify( evaled, evalflags.prt.value )}`
						: evaled = `hm... doesn't looks like a table or an array but ok\nhere's ur *${typeof evaled}* for u: ${String( evaled )}`

					return true
				}

				if( evalflags.silent )
					return false

				switch( typeof evaled ){
					case 'undefined':
						evaled = 'undefined'
						return __printerr

					case 'boolean':
					case 'bigint':
					case 'symbol':
						evaled = String( evaled )
						if( !__printerr && !evalflags.cb && code === evaled )
							return
						break

					case 'number':
						if( !__printerr && !evalflags.cb && /^[+-]?([\w_]+|(\d+)?(\.\d+)?(e\d+)?)$/i.test( code ) )
							return
						evaled = numsplit( evaled )
						break

					case 'string':
						if( !__printerr && !evalflags.cb && code[0] === code[code.length - 1] && '"\'`'.search( code[0] ) + 1 )
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
							case 'MessageEmbed':
							case 'Jimp':
								msg.send( evaled )
								return

							case 'Array':
								evaled = `here's ur array for u: ${printify( evaled, 1 )}`
								break

							default:
								evaled = String( evaled )
								break
						}
						break

					case 'function':
						let funcbody = String( evaled )
						let indent = funcbody.matchFirst( /\n(\s+)[^\n]+$/ )

						if( indent ){
							indent = ( indent.match( /\t/g )?.length ?? 0 ) + ( indent.match( /\s{4}/g )?.length ?? 0 )
							funcbody = funcbody.replace( new RegExp( `^(\\t|[^\\t\\S]{4}){${indent}}`, 'gm' ), '' )
						}

						evaled = funcbody
						evalflags.cb = { value: 'js' }
						break

					default:
						evaled = `Result parse error: unknown type "${typeof evaled}" of evaled`
						break
				}

				return true
			})()

			if( printEvaled ){
				if( typeof evaled !== 'string' )
					return
				else if( !evalflags.cb && evaled.indexOf( '\n' ) !== -1 )
					evalflags.cb = true
			}

			if( __output ){
				if( printEvaled )
					print( evaled )

				msg.sendcb( __output )
				msg.isCommand = true
			} else if( printEvaled ){
				if( !evalflags.cb && !msg.member.permissions.has( discord.Permissions.FLAGS.EMBED_LINKS ) )
					evaled = evaled.replace( /(https?:\/\/\S+)/g, '<$1>' )

				await msg.send( evalflags.cb ? cb( evaled, evalflags.cb.value ) : evaled )
				msg.isCommand = true
				return abortHQ()
			}

			return abortHQ()
		} catch( err ){
			if( __printerr ){
				if( err )
					msg.sendcb( err?.stack )
				else
					msg.send( `OK, i catched the error but somewhat i've got ${err} instead of error...` )

				return abortHQ()
			}
		}

		return abortHandlersQueue
	}
})

//////////  Command manager  //////////
const CM = new CommandManager( client, /^(-|(mao|мао)\s+)/i, true )
CM.setModuleAccessor( ( user, module ) => !module.isHidden || user.isMaster() )
MM.unshiftHandler( 'commands', true, ( ...args ) => CM.handleMessage( ...args ) )

if( __flags.dev ){
	const missplaced_props = []
	let print = ( command, property ) => missplaced_props.push( [command, property] )

	client.once( 'ready2', () => {
		print = ( command, property ) => {
			console.log()
			console.log( '[CM] Warning: misplaced properties found:' )
			console.warn(
				`    command(\`${command.fullName}\`):\n        \`.${property}\` must be at \`.description.${property}\``
			)
			console.log()
		}

		missplaced_props.forEach( warn => print( ...warn ) )
	})

	const description_props = [
		'single',
		'short',
		'full',
		'usage',
		'example',
	]
	description_props.push( ...description_props.map( prop => prop + 's' ) )

	CM.propChecker = ( command, options ) => {
		description_props.forEach( property => {
			if( options[property] )
				print( command, property )
		})
	}
}

CM.on( 'cant-access', ( msg, command ) => {
	console.log( `[CM] User "${msg.author.username}" (${msg.author.id}) tried to access "${command.name}" command` )

	msg.author.nextWeirdReaction ??= Date.now() + 1337

	if( msg.author.nextWeirdReaction < Date.now() ){
		msg.author.nextWeirdReaction = Date.now() + 13370
		msg.send( ':/' )
	}
})

// Special prefix if logged in as MaoDev#2638
client.on( 'ready', () => {
	if( client.user.id == '598593004088983688' )
		CM.prefix = /^(--\s*)/i
})

// Including commands
logw( 'Including commands...' )
	readdir( './commands' ).forEach( module_folder => {
		const moduleIsHidden = module_folder[0] === '_'
		const module = CM.addModule( module_folder.substr( moduleIsHidden ? 1 : 0 ), moduleIsHidden )

		readdir( './' + join( 'commands', module_folder ) ).forEach( file => {
			if( file.endsWith( '.js' ) ){
				const path = './' + join( 'commands', module_folder, file )

				try {
					include( path, {
						addCmd: ( aliases, description, callback ) => {
							if( typeof aliases !== 'string' && aliases instanceof Object ){
								let options = aliases
								options.module = module
								return CM.addCommand( options )
							}

							return CM.addCommand({ module, aliases, description, callback })
						},
					})
				} catch( err ){
					log( `\n    Failed to include "${path}" file...` )
					throw err
				}
			}
		})
	})
log( 'OK' )

//////////  Finish  //////////
initializationTime = Math.round( Date.now() - startedAt )

if( isOnlineOrInitialized ){
	delete isOnlineOrInitialized
	loginTime = -1
	log( `\nInitialization finished in ${numsplit( initializationTime )}ms and I'm already online.` )
	client.emit( 'ready2' )
} else {
	isOnlineOrInitialized = true
	loginTime = Date.now()
	log( `\nInitialization finished in ${numsplit( initializationTime )}ms, logging in...` )
}
