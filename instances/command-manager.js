// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { Events } = require( 'discord.js' )
const { CommandManager } = require( '@/re/command-manager' )
const MM = require( '@/instances/message-manager' )
const client = require( '@/instances/client' )
const { flags } = require( '@/index' )
const { getModuleSettings } = require( '@/functions/getModuleSettings' )

const prefix = flags.dev
	? /^(--\s*)/i
	: /^(-|(mao|мао)\s+)/i

const CM = new CommandManager( client, prefix, true )
MM.unshiftHandler( 'commands', true, ( ...args ) => CM.handleMessage( ...args ) )

CM.setModuleAccessor( /**
 * @param {import('discord.js').Message} message
 * @param {import('../re/command-manager').Module} module
 * @returns {boolean}
 */ ( message, module ) => {
	if( !message.guild )
		return false

	if( module.isDev )
		return message.author.isMaster()

	if( module.isAlwaysEnabled )
		return true

	const globalSettings = getModuleSettings( module )
	const guildSettings = getModuleSettings( module, message.guild.id )

	return globalSettings.enabled && guildSettings.enabled
})

module.exports = CM

// dev debugger
if( flags.dev ){
	const misplaced_props = []
	let print = ( command, property ) => misplaced_props.push( [command, property] )

	client.once( Events.ClientReady, () => {
		print = ( command, property ) => {
			console.log()
			console.log( '[CM] Warning: misplaced properties found:' )
			console.warn(
				`    command(\`${command.fullName}\`):\n        \`.${property}\` must be at \`.description.${property}\``
			)
			console.log()
		}

		misplaced_props.forEach( warn => print( ...warn ) )
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