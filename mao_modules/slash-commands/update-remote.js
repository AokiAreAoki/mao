const rest = require( './rest' )
const routes = require( './route' )
const localCommands = require( './commands' )

// eslint-disable-next-line no-global-assign
require = global.alias
const { flags } = require( '@/index' )

async function updateRemoveCommand(){
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

	rest.put( routes.commands(), {
		body: localCommands.commandData,
	})
}

module.exports = updateRemoveCommand