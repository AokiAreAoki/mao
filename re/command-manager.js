
const { Collection } = require( '../node_modules/discord.js' )

String.prototype.matchFirst = function( re, cb ){
	let matched = this.match( re )
	
	if( matched )
		matched = matched[1] ?? matched[0]

	if( matched && typeof cb === 'function' )
		cb( matched )

	return matched
}

class CommandManager {
	client
	prefix
	considerMentionAsPrefix
	modules = new Collection()
	commands = new Collection()
	list_commands = []

	constructor( client, prefix, considerMentionAsPrefix = false ){
		this.client = client
		this.prefix = prefix
		this.considerMentionAsPrefix = !!considerMentionAsPrefix
	}

	addModule( module_printname, isHidden = false ){
		const module = new Module( module_printname, this )
		this.modules.set( module.name, module )

		if( isHidden )
			module.isHidden = true

		return module
	}

	addCommand( options ){
		options.cm = this
		const command = new Command( options )

		this.list_commands.push( command )
		command.aliases.forEach( alias => this.commands.set( alias, command ) )
		command?.module.commands.push( command )

		return command
	}

	findCommand( string_args ){
		const subcommands = string_args.split( /\s+/ )
		let command = this.commands.get( subcommands.shift() )

		for( const subcommand_name of subcommands ){
			const subcommand = command.subcommands.get( subcommand_name )

			if( !subcommand )
				break

			command = subcommand
		}

		return command
	}

	findCommandAndArgs( string_args ){
		if( typeof string_args !== 'string' )
			return []
			
		const subcommands = string_args.split( /\s+/ )
		let command = this.commands.get( subcommands[0] )

		if( !command )
			return []

		string_args = string_args.substr( subcommands[0].length ).trimLeft()
		let command_name = [subcommands.shift()]

		for( const subcommand_name of subcommands ){
			const subcommand = command.subcommands.get( subcommand_name )

			if( !subcommand )
				break

			command = subcommand
			command_name.push( subcommand_name )
			string_args = string_args.substr( subcommand_name.length ).trimLeft()
		}

		return [command, command_name, string_args]
	}

	handleMessage( msg, hasBeenEdited ){
		// Ignore bots and itself
		if( msg.author.id == this.client.user.id || msg.author.bot )
			return

		// Checking for prefix
		let prefix = msg.content.matchFirst( this.prefix )

		if( !prefix && this.considerMentionAsPrefix )
			prefix = msg.content.matchFirst( new RegExp( `^<@!?${client.user.id}>\s*` ) )

		// If prefix found
		if( prefix ){
			const [command, command_name, string_args] = this.findCommandAndArgs( msg.content.substring( prefix.length ) )
			
			if( command ){
				if( !this.canAccessModule( msg.author, command.module ) )
					return

				msg.isCommand = true

				// Parsing arguments
				const args = ArgumentParser.new( string_args, command )

				command_name.forEach( ( v, k ) => {
					k -= command_name.length
					args[k] = v
				})
				
				if( command.callback instanceof Function )
					command.callback( msg, args, args.get_string )
				else
					log( `Error: callback of "${command}" command is a ${typeof command.callback}, a function expected` )
				
				return true
			}
		}
	}

	setModuleAccessor( accessor ){
		this.moduleAccessor = accessor
	}

	canAccessModule( user, module ){
		if( !( module instanceof Module ) )
			module = this.modules.get( module )

		return !!this.moduleAccessor( user, module )
	}
}

let prop_warns = false // disable prop check
//prop_warns = [] // enable prop check

class Command {
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

		if( prop_warns ){
			[ // missplaced properties
				'short',
				'full',
				'usages',
				'examples',
			].forEach( property => {
				if( options[property] ){
					if( prop_warns.length === 0 ){
						this.cm.client.once( 'ready', () => {
							setTimeout( () => {
								console.log()
								
								prop_warns.forEach( warn => {
									console.warn( `(${warn.command}).${warn.property} property must be at (${warn.command}).description.${warn.property}` )
								})

								console.log()
								prop_warns = false
							}, 1337 )
						})
					}

					prop_warns.push({ command: this.fullName, property })
				}
			})
		}
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
		options.module = this.module
		options.parent = this
		options.cm = this.cm
		
		const command = new Command( options )
		this.subcommands.push( command )
		return command
	}

	recursiveSubcommandsList = false

	listSubcommands( parentPath = this.name ){
		const list = []

		this.subcommands.forEach( subcommand => {
			const path = subcommand.parentTree.map( c => c === subcommand ? c.aliases.join( '\`/\`' ) : c.name ).join( '\` \`' )
			const subs = !this.recursiveSubcommandsList && subcommand.subcommands.length !== 0 ? `(${subcommand.subcommands.length})` : ''

			list.push( `• \`${path}\`${subs} - ${subcommand.description.short}` )

			if( this.recursiveSubcommandsList && subcommand.subcommands.length !== 0 )
				list.push( ...subcommand.listSubcommands( path ) )
		})

		return list
	}

	toString(){
		return `[object Command(\`${this.name}\`)]`
	}
}
CommandManager.Command = Command

function CommandFlag( ...args ){
	this.name = args.shift().toLowerCase()
	const usage = new Usage( args )
	this.description = usage.description
	this.args = usage.args
}

class ArgumentParser extends Array {
	static flagPrefix = /^(--|\/)/
	string
	pos = []
	flags = null

	static new( string_args, command = null ){
		const ap = new ArgumentParser()
		ap.parse( string_args, command )
		return ap
	}

	parse( string_args, command = null ){
		this.string = string_args
		this.parseArgs()

		if( command?.hasFlags ){
			this.flags = {}

			for( let i = 0; i < this.length; ++i ){
				const arg = this[i].trim().toLowerCase()
				const prefix = arg.matchFirst( ArgumentParser.flagPrefix )
				
				if( !prefix )
					continue

				const flag = command.flags.get( arg.substr( prefix.length ) )

				if( flag ){
					this.spliceArgs(i)
					this.flags[flag.name] = this.spliceArgs( i, flag.args.length )
					--i
				}
			}
		}
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
		this.string = this.string.substr( pos )
		
		return arg
	}
	
	spliceArgs( pos, amount = 1 ){
		if( amount === 0 )
			return []

		this.pos.splice( pos, amount )
		return super.splice( pos, amount )
		
		const spliced = []

		for( let i = pos; i < pos + amount; ++i )
			spliced.push( this[i] )
		
		for( let i = pos + amount; i < this.length; ++i )
			this[i - amount] = this[i]

		for( let i = 0; i < amount; ++i )
			super.pop()

		return spliced
	}

	get_string( number = 0 ){
		if( typeof this.pos[number] === 'number' )
			return this.string.substring( this.pos[number] )
	}

	parseArgs(){
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
}
CommandManager.ArgumentParser = ArgumentParser

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

	//*
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
CommandManager.SubcommandsArray = SubcommandsArray

class CommandDescription {
	command = null
	short = 'no description :('
	full = 'No description :('
	usages = []
	examples = []

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

		this.short = this.uncapitalize( this.short )
		this.full = this.capitalize( this.full )

		usages?.forEach( args => {
			if( typeof args === 'string' )
				this.usages.push( args )
			else if( args instanceof Array )
				this.usages.push( new Usage( args ) )
		})
		
		examples?.forEach( args => {
			if( args instanceof Array ){
				const description = args.pop()
				this.examples.push({ args, description })
			}
		})
	}

	capitalize( text ){
		if( typeof text !== 'string' || text.length === 0 )
			return null

		return text[0].toUpperCase() + text.substr(1)
	}
	
	uncapitalize( text ){
		if( typeof text !== 'string' || text.length === 0 )
			return null

		return text[0].toLowerCase() + text.substr(1)
	}
	
	toString(){
		/// Single new line ///
		let array = [
			`Aliases: \`${this.command.aliases.join( '`, `' )}\``
		]

		// Description
		if( this.full )
			array.push( this.full )

		/// Double new line ///
		array = [array.join( '\n' )]

		// Flags
		if( this.command.hasFlags )
			array.push( 'Flags:\n' + this.command.flags.map( flag => {
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

			array.push( 'Usage:\n' + usage )
		}

		// Example
		if( this.examples.length !== 0 ){
			const examples = this.examples.map( example => {
				const args = [...this.command.fullName.split( ' ' ), ...example.args]
				const description = example.description ? ' - ' + example.description : ''
				return `• \`${args.join( '\` \`' )}\`${description}`
			}).join( '\n' )

			array.push( `Example${examples.length === 1 ? '' : 's'}:\n${examples}` )
		}

		// Subcommands
		if( this.command.subcommands.length !== 0 )
			array.push( 'Subcommands:\n' + this.command.listSubcommands().join( '\n' ) )

		/// End ///
		return array.join( '\n\n' ) || 'no description :('
	}
}
CommandManager.CommandDescription = CommandDescription

function Usage( args ){
	const description = args.pop()

	this.args = args.map( arg => arg.replace( /(@@)/g, ( matched, placeholder ) => {
		if( placeholder === '@@' )
			return '@someuser#1337'

		return matched
	}))
	
	this.description = description.replace( /(\$\d+)/g, ( matched, placeholder ) => {
		if( placeholder[0] === '$' ){
			const arg = args[parseInt( placeholder.substr(1) ) - 1]
			
			if( arg )
				return `\`${arg}\``
		}

		return matched
	})
}
CommandManager.Usage = Usage

class Module {
	static unprintname( module_printname ){
		return module_printname.toLowerCase().replace( /\s+/g, '_' )
	}

	commands = []
	isHidden = false

	constructor( printname, cm ){
		this.printname = printname
		this.name = Module.unprintname( printname )
		this.cm = cm
	}

	isAccessibleFor( user ){
		return this.cm?.canAccessModule( user, this )
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
CommandManager.Module = Module

module.exports = CommandManager