const { Collection } = require( '../node_modules/discord.js' )

String.prototype.matchFirst = function( re, cb ){
	let matched = this.match( re )

	if( matched )
		matched = matched[1] ?? matched[0]

	if( matched && typeof cb === 'function' )
		cb( matched )

	return matched
}

const quotes = '```'
const cb = ( text, lang = '' ) => `${quotes}${lang}\n${text}\n${quotes}`

/**
 * @function ModuleAccessor
 * @param {import('discord.js').Message} message
 * @param {Module} module
 * @returns {boolean}
 */

class CommandManager {
	client
	prefix
	considerMentionAsPrefix
	mentionRE
	/** @type {Collection<string, Module>} */
	modules = new Collection()
	/** @type {Collection<string, Command>} */
	commands = new Collection()
	listCommands = []
	deleteAfterDelay = 8e3
	/** @type {ModuleAccessor} */
	moduleAccessor = () => true

	constructor( client, prefix, considerMentionAsPrefix = false ){
		this.client = client
		this.prefix = prefix
		this.considerMentionAsPrefix = !!considerMentionAsPrefix
	}

	/**
	 * @param {ModuleSettings} settings
	 */
	addModule( settings ){
		const module = new Module( settings, this )
		this.modules.set( module.name, module )
		return module
	}

	addCommand( options ){
		options.cm = this
		const command = new Command( options )

		this.listCommands.push( command )
		command.aliases.forEach( alias => this.commands.set( alias, command ) )
		command?.module.commands.push( command )

		return command
	}

	findCommand( stringArgs ){
		const subcommands = stringArgs.split( /\s+/ )
		let command = this.commands.get( subcommands.shift() )

		for( const subcommandName of subcommands ){
			if( !command )
				return null

			const subcommand = command.subcommands.get( subcommandName )

			if( !subcommand )
				break

			command = subcommand
		}

		return command
	}

	findCommandAndArgs( stringArgs ){
		if( typeof stringArgs !== 'string' )
			return []

		const originalStringArgs = stringArgs
		stringArgs = stringArgs.toLowerCase()

		const subcommands = stringArgs.split( /\s+/ )
		const deleteAfterDelay = subcommands[0] === 'd'

		if( deleteAfterDelay )
			stringArgs = stringArgs.substring( subcommands.shift().length ).trimStart()

		let command = this.commands.get( subcommands[0] )

		if( !command )
			return []

		stringArgs = stringArgs.substring( subcommands[0].length ).trimStart()
		const path = [subcommands.shift()]

		for( const subcommandName of subcommands ){
			const name = subcommandName
			const subcommand = command.subcommands.get( name )

			if( !subcommand )
				break

			command = subcommand
			path.push( name )
			stringArgs = stringArgs.substring( name.length ).trimStart()
		}

		stringArgs = originalStringArgs.substring( originalStringArgs.length - stringArgs.length )

		return command
			? [command, path, stringArgs, deleteAfterDelay]
			: []
	}

	async handleMessage( msg ){
		msg.getReferencedMessage().then( m => {
			if( m?.deleteAfterDelay )
				m.delay?.expand()
		})

		// Ignore bots and the client user itself
		if( msg.author.id == this.client.user.id || msg.author.bot )
			return

		// Checking for prefix
		let prefix = msg.content.matchFirst( this.prefix )

		if( !prefix ){
			if( !this.considerMentionAsPrefix )
				return

			prefix = msg.content.matchFirst( this.mentionRE ??= new RegExp( `^<@!?${this.client.user.id}>\\s*` ) )

			if( !prefix )
				return
		}

		// If prefix found
		const [
			command,
			path,
			stringArgs,
			deleteAfterDelay,
		] = this.findCommandAndArgs( msg.content.substring( prefix.length ) )

		if( command ){
			msg.isCommand = true

			if( !this.canAccessModule( msg, command.module ) )
				return

			const session = msg.response.session

			if( !( command.callback instanceof Function ) ){
				await session.update( command.help )
				return true
			}

			// Parsing arguments
			const args = ArgumentParser.new( stringArgs, command, path )

			if( msg.deleteAfterDelay = deleteAfterDelay ){
				msg.react( '⏰' )
				msg.delay = new ExpandableDelay( this.deleteAfterDelay, this.deleteAfterDelay * 2 )
				msg.delay.onTimeout( () => {
					msg.delete()
				})
			}

			try {
				await command.callback.call( command, { msg, args, session } )
			} catch( error ){
				session.update( cb( error ) )
				console.error( `[CommandManager] Error executing callback of "${command.name}" command: ${error.stack}` )
			}

			return true
		}
	}

	/** @param {ModuleAccessor} accessor */
	setModuleAccessor( accessor ){
		this.moduleAccessor = accessor
	}

	canAccessModule( message, module ){
		if( !( module instanceof Module ) )
			module = this.modules.get( module )

		return !!this.moduleAccessor( message, module )
	}
}

class ExpandableDelay {
	constructor( delay, maxDelay ){
		this.delay = delay
		this.deadline = Date.now() + maxDelay
		this.maxDelayReached = false
		this.callbacks = []
		this.timer = setTimeout( () => this.timeout(), delay )
		this.finished = false
	}

	onTimeout( callback ){
		if( this.finished )
			return void callback()

		this.callbacks.push( callback )
	}

	expand(){
		if( this.maxDelayReached )
			return false

		let endTime = Date.now() + this.delay

		if( endTime > this.deadline ){
			endTime = this.deadline
			this.maxDelayReached = true
		}

		clearTimeout( this.timer )
		this.timer = setTimeout( () => this.timeout(), endTime - Date.now() )
		return true
	}

	timeout(){
		if( this.finished )
			return

		this.finished = true
		this.callbacks.forEach( c => c() )
		delete this.callbacks
	}
}

class Command {
	static recursiveSubcommandsList = false
	subcommands = new SubcommandsArray()
	parent = null

	constructor( options ){
		let {
			module,
			aliases,
			flags,
			callback,
			parent,
			cm,
			description,
		} = options

		aliases = aliases.split( /\s+/ )

		this.module = module
		this.aliases = aliases
		this.flags = new Collection()
		this.callback = callback
		this.parent = parent
		this.cm = cm

		flags?.forEach( flagArgs => {
			if( flagArgs instanceof Array ){
				const flag = new CommandFlag( ...flagArgs )
				this.flags.set( flag.name, flag )
			}
		})

		this.hasFlags = this.flags.size !== 0

		if( !this.hasFlags )
			this.flags = null

		if( description instanceof CommandDescription )
			this.description = description
		else {
			if( typeof description === 'string' )
				description = { single: description }

			description = description ?? {}
			description.command = this
			this.description = new CommandDescription( description )
		}

		if( this.cm.propChecker instanceof Function )
			this.cm.propChecker( this, options )
	}

	get parentTree(){
		if( this.parent instanceof Command ){
			const parentTree = this.parent.parentTree
			parentTree.push( this )
			return parentTree
		}

		return [this]
	}

	get name(){
		return this.aliases[0]
	}

	get fullName(){
		return this.parentTree.map( c => c.name ).join( ' ' )
	}

	addSubcommand( options ){
		const command = new Command({
			...options,
			module: this.module,
			parent: this.parent,
			cm: this.cm,
		})

		this.subcommands.push( command )
		return command
	}

	// eslint-disable-next-line no-unused-vars
	listSubcommands( parentPath = this.name ){
		const list = []

		this.subcommands.forEach( subcommand => {
			const path = subcommand.parentTree.map( c => c === subcommand ? c.aliases.join( '`/`' ) : c.name ).join( '` `' )
			const subs = !Command.recursiveSubcommandsList && subcommand.subcommands.length !== 0 ? `(${subcommand.subcommands.length})` : ''

			list.push( `• \`${path}\`${subs} - ${subcommand.description.short}` )

			if( Command.recursiveSubcommandsList && subcommand.subcommands.length !== 0 )
				list.push( ...subcommand.listSubcommands( path ) )
		})

		return list
	}

	get help(){
		return String( this.description )
	}

	toString(){
		return `[object Command(\`${this.name}\`)]`
	}
}

function CommandFlag( ...args ){
	this.name = args.shift().toLowerCase()
	const usage = new Usage( args )
	this.description = usage.description
	this.args = usage.args
}

class ArgumentParser extends Array {
	static flagPrefix = /^(--|\/)/
	string = ''
	pos = []
	flags = null

	static new( stringArgs, command = null, path = [] ){
		const ap = new ArgumentParser()
		ap.parse( stringArgs, command, path )
		return ap
	}

	parse( stringArgs, command = null, path = [] ){
		this.string = stringArgs
		this.parseArgs()

		if( command?.hasFlags ){
			this.flags = {}

			for( let i = this.length - 1; i >= 0; --i ){
				const arg = this[i].trim().toLowerCase()
				const prefix = arg.matchFirst( ArgumentParser.flagPrefix )

				if( !prefix )
					continue

				const flag = command.flags.get( arg.substr( prefix.length ) )

				if( flag ){
					const flagInstance = this.spliceArgs( i, flag.args.length + 1 )
					flagInstance.shift()
					flagInstance.class = flag
					flagInstance.specified = true
					this.flags[flag.name] = flagInstance
				}
			}

			command.flags.forEach( ( _, flag ) => {
				if( !this.flags[flag] )
					this.flags[flag] = []
			})

			this.parseArgs()
		}

		if( !( path instanceof Array ) )
			path = [path]

		path.forEach( ( v, i ) => {
			i -= path.length
			this[i] = v
		})

		this.negativeLength = -path.length
	}

	pop(){
		const arg = super.pop()
		const pos = this.pos.pop()
		this.string = this.string.substring( 0, pos ).trimRight()
		return arg
	}

	shift(){
		const arg = super.shift()
		this.pos.shift()

		const pos = this.pos[0]
		this.pos = this.pos.map( p => p - pos )
		this.string = this.string.substring( pos )

		return arg
	}

	shiftLeft(){
		for( let i = this.negativeLength; i < 0; ++i )
			this[i - 1] = this[i]

		this[-1] = this.shift()
		--this.negativeLength
	}

	spliceArgs( pos, amount = 1 ){
		if( amount === 0 )
			return []

		const posses = this.pos.splice( pos, amount )
		const args = Array.from( super.splice( pos, amount ) )

		const last = args.length - 1
		this.string = this.string.substring( 0, posses[0] )
			 + this.string.substr( posses[last] + args[last].length )

		return args
	}

	getRaw( number = 0 ){
		if( typeof this.pos[number] === 'number' )
			return this.string.substring( this.pos[number] )
	}

	parseArgs(){
		this.length = 0
		this.pos.length = 0
		let arg = '', pos = 0, quotes = ''

		for( let i = 0; i < this.string.length; ++i ){
			let char = this.string[i]

			if( !quotes && /\s/.test( char ) ){
				if( arg ){
					this.push( arg )
					this.pos.push( pos )
					arg = ''
				}
			} else {
				if( quotes ){
					if( char == quotes ){
						this.push( arg )
						this.pos.push( pos )
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

				if( !arg && !quotes )
					pos = i

				arg += char
			}
		}

		if( arg ){
			this.push( arg )
			this.pos.push( pos )
		}
	}

	toString(){
		const path = []

		for( let i = this.negativeLength; i < 0; ++i )
			path.push( this[i] )

		return `${path.join( '::' )}( \`${this.join( '`, `' )}\` )`
	}
}

class SubcommandsArray extends Array {
	lookupMap = new Collection()

	constructor(){
		super()
	}

	push( ...commands ){
		super.push( ...commands )

		commands.forEach( command => {
			command.aliases.forEach( alias => this.lookupMap.set( alias, command ) )
		})
	}

	get( name ){
		if( typeof name === 'string' )
			return this.lookupMap.get( name.toLowerCase() )
	}

	listCommands( tab = '' ){
		return this.map( ( command, index ) => {
			const last = index === this.length - 1
			let description = `${tab}${index === this.length - 1 ? '└─' : '├─'} ${command.name} :: ${command.description.short}`

			if( command.subcommands.length !== 0 )
				description += '\n' + command.subcommands.listCommands( tab + ( last ? '   ' : '│  ' ) )

			return description
		}).join( '\n' )
	}
}

class CommandDescription {
	static capitalize( text ){
		if( typeof text !== 'string' || text.length === 0 )
			return null

		return text[0].toUpperCase() + text.substring(1)
	}

	static unCapitalize( text ){
		if( typeof text !== 'string' || text.length === 0 )
			return null

		return text[0].toLowerCase() + text.substring(1)
	}

	command = null
	short = 'no description :('
	full = 'No description :('
	usages = []
	examples = []
	_cache = ''

	constructor({
		command,
		single,
		short,
		full,
		usages = [],
		examples = []
	}){
		this.command = command ?? this.command

		if( single ){
			single = single ?? 'no description :('
			this.short = single
			this.full = single
		} else {
			this.short = short ?? this.short
			this.full = full ?? this.full

			if( this.full instanceof Array )
				this.full = this.full.join( '\n' )
		}

		this.short = CommandDescription.unCapitalize( this.short )
		this.full = CommandDescription.capitalize( this.full )

		usages?.forEach( args => {
			if( typeof args === 'string' )
				this.usages.push( args )
			else if( args instanceof Array )
				this.usages.push( new Usage( args ) )
		})

		examples?.forEach( args => {
			if( typeof args === 'string' )
				this.examples.push( args )
			else if( args instanceof Array )
				this.examples.push( new Example( args ) )
		})
	}

	toString(){
		if( this._cache )
			return this._cache

		//// Single line breaks
		let lines = [
			`Aliases: \`${this.command.aliases.join( '`, `' )}\``
		]

		// Description
		if( this.full )
			lines.push( this.full )

		//// Double line breaks
		lines = [lines.join( '\n' )]

		// Flags
		if( this.command.hasFlags )
			lines.push( 'Flags:\n' + this.command.flags.map( flag => {
				return `• \`${[flag.name, ...flag.args].join( '` `' )}\` - ${flag.description}`
			}).join( '\n' ) )

		// Usage
		if( this.usages.length !== 0 ){
			const usage = this.usages.map( usage => {
				if( typeof usage === 'string' )
					return `   ${usage}`

				const args = [
					...this.command.fullName.split( ' ' ),
					...usage.args,
				].map( arg => {
					if( arg[0] === '\n' )
						return `\n   \`${arg.substr(1)}\``

					return `\`${arg}\``
				})

				const description = usage.description ? ' - ' + usage.description : ''
				return `• ${args.join( ' ' )}${description}`
			}).join( '\n' )

			lines.push( 'Usage:\n' + usage )
		}

		// Example
		if( this.examples.length !== 0 ){
			const examples = this.examples.map( example => {
				const args = [...this.command.fullName.split( ' ' ), ...example.args]
				const description = example.description ? ' - ' + example.description : ''
				return `• \`${args.join( '` `' )}\`${description}`
			}).join( '\n' )

			lines.push( `Example${examples.length === 1 ? '' : 's'}:\n${examples}` )
		}

		// Subcommands
		if( this.command.subcommands.length !== 0 )
			lines.push( 'Subcommands:\n' + this.command.listSubcommands().join( '\n' ) )

		//// End
		return this._cache = lines.join( '\n\n' ) || 'no description :('
	}
}

function Usage( args ){
	const description = args.pop()

	this.args = args = args.map( arg => arg.replace( /(@@)/g, ( matched, placeholder ) => {
		if( placeholder === '@@' )
			return '@user'

		return matched
	}))

	this.description = description?.replace( /(@@|\$\d+)/g, ( matched, placeholder ) => {
		if( placeholder === '@@' )
			return '`@user`'

		if( placeholder[0] === '$' ){
			const arg = args[parseInt( placeholder.substr(1) ) - 1]

			if( arg )
				return `\`${arg}\``
		}

		return matched
	})
}

function Example( args ){
	const description = args.pop()

	this.args = args = args.map( arg => arg.replace( /(@@)/g, ( matched, placeholder ) => {
		if( placeholder === '@@' )
			return '@someuser#1337'

		return matched
	}))

	this.description = description?.replace( /(@@|\$\d+)/g, ( matched, placeholder ) => {
		if( placeholder === '@@' )
			return '@someuser#1337'

		if( placeholder[0] === '$' ){
			const arg = args[parseInt( placeholder.substr(1) ) - 1]

			if( arg )
				return `\`${arg}\``
		}

		return matched
	})
}

/**
 * @typedef {Object} ModuleSettings
 * @property {string} printname
 * @property {boolean} isEnabledByDefault
 * @property {boolean} [isDev]
 * @property {boolean} [isAlwaysEnabled]
 */

class Module {
	static unprintname( module_printname ){
		return module_printname.toLowerCase().replace( /\s+/g, '_' )
	}

	commands = []

	/**
	 * @param {ModuleSettings} settings
	 * @param {CommandManager} cm
	 */
	constructor( settings, cm ){
		const {
			printname,
			isEnabledByDefault,
			isDev,
			isAlwaysEnabled,
		} = settings

		this.name = Module.unprintname( printname )
		this.printname = printname
		this.enabledByDefault = isEnabledByDefault
		this.isAlwaysEnabled = isAlwaysEnabled
		this.isDev = isDev
		this.cm = cm
	}

	isAccessibleFor( message ){
		return this.cm?.canAccessModule( message, this )
	}

	// spec. chars:
	// '└─ '
	// '├─ '
	// '   '
	// '│  '

	listCommands(){
		return this.commands.map( ( command, index ) => {
			let description = `${index === this.commands.length - 1 ? '└─' : '├─'} ${command.fullName} :: ${command.description.short}`

			if( command.subcommands.length !== 0 ){
				const tab = index === this.commands.length - 1 ? '   ' : '│  '
				description += '\n' + command.subcommands.listCommands( tab )
			}

			return description
		}).join( '\n' )
	}
}

module.exports = {
	CommandManager,
	ExpandableDelay,
	Command,
	CommandFlag,
	ArgumentParser,
	SubcommandsArray,
	CommandDescription,
	Usage,
	Example,
	Module,
}
