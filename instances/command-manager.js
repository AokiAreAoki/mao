// eslint-disable-next-line no-global-assign
require = global.alias
const { Events } = require( 'discord.js' )
const CommandManager = require( '@/re/command-manager' )
const MM = require( '@/instances/message-manager' )
const client = require( '@/instances/client' )
const { flags } = require( '@/index' )

const prefix = flags.dev
	? /^(--\s*)/i
	: /^(-|(mao|мао)\s+)/i

const CM = new CommandManager( client, prefix, true )
CM.setModuleAccessor( ( user, module ) => !module.isHidden || user.isMaster() )
MM.unshiftHandler( 'commands', true, ( ...args ) => CM.handleMessage( ...args ) )

CM.on( 'cant-access', ( msg, command ) => {
	console.log( `[CM] User "${msg.author.username}" (${msg.author.id}) tried to access "${command.name}" command` )

	msg.author.nextWeirdReaction ??= Date.now() + 1337

	if( msg.author.nextWeirdReaction < Date.now() ){
		msg.author.nextWeirdReaction = Date.now() + 13370
		msg.send( ':/' )
	}
})

module.exports = CM

// dev debugger
if( flags.dev ){
	const missplaced_props = []
	let print = ( command, property ) => missplaced_props.push( [command, property] )

	client.once( Events.ClientReady, () => {
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

		if( options.description.flags )
			print( command, 'description/flags' )
	}
}