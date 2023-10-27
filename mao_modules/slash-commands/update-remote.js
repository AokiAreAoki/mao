const rest = require( './rest' )
const routes = require( './route' )
const localCommands = require( './commands' )

// eslint-disable-next-line no-global-assign
require = global.alias
const { flags } = require( '@/index' )

async function updateRemoteCommand(){
	const remoteCommands = await rest.get( routes.commands() )

	if( flags.dev ){
		console.log( `local commands:`, localCommands )
		console.log( `remote commands:`, remoteCommands )
	}

	remoteCommands
		.filter( cmd => !localCommands.has( cmd.name ) )
		.reduce( async ( prev, cmd ) => {
			await prev
			console.log( `[SCM] remote command \`${cmd.name}\` does not exist locally anymore. Deleting...` )
			await rest.delete( routes.commands( cmd.id ) )
			console.log( `[SCM] remote command \`${cmd.name}\` has been deleted.` )
		}, Promise.resolve() )

	const commandData = []

	for( const command of localCommands.values() ){
		commandData.push( command.data.toJSON() )
	}

	rest.put( routes.commands(), {
		body: commandData,
	})
}

module.exports = updateRemoteCommand