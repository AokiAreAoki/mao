// eslint-disable-next-line no-global-assign
require = global.alias(require)
const Embed = require( '@/functions/Embed' )
const numsplit = require( '@/functions/numsplit' )
const client = require( '@/instances/client' )
const bakadb = require( '@/instances/bakadb' )

module.exports = async function sendAfterRestartMessage() {
	const restart = bakadb.get( "restart" )
	if( !restart ) return

	await client.whenReady

	const {
		initializedIn,
		loggedIn,
	} = require( '@/index' )

	console.log( require( '@/index' ) )

	const timePassed = Date.now() - restart.timestamp
	const channel = await client.channels.fetch( restart.channel )

	if( !channel ) return
	if( timePassed > 600e3 ) return

	const embed = Embed()
		.setTitle( "🚀 Yay, I'm back again!" )
		.addFields(
			{
				name: "🏗️ Init",
				value: `\`${numsplit( initializedIn )}ms\``,
				inline: true
			},
			{
				name: "📡 Login",
				value: `\`${numsplit( loggedIn )}ms\``,
				inline: true
			},
			{
				name: "🛠️ Overall",
				value: `\`${numsplit( timePassed )}ms\``,
				inline: true
			},
		)
		.setTimestamp( Date.now() )

	channel.send( embed )
		.then( async m => {
			m.purge( 5e3 )
			bakadb.delete( "restart" )
			bakadb.save()
		})
		.catch( () => {} )

	channel.messages.fetch( restart.message )
		.then( m => m.purge( 1337 ) )
		.catch( () => {} )

	channel.cacheLastMessages()
}