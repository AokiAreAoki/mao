// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { Events } = require( "discord.js" )
		const client = require( "@/instances/client" )
		const FendWrapper = require( "@/re/fend" )

		client.once( Events.ClientReady, () => {
			FendWrapper.checkVersion()
		})

		const FEND_ABOUT = `Arbitrary-precision unit-aware calculator`

		addCommand({
			aliases: 'fend f',
			description: {
				short: FEND_ABOUT,
				full: [
					FEND_ABOUT,
					``,
					`- Check [fend github](<https://github.com/printfn/fend>) for more information`,
				],
				usages: [
					['<expression>', 'evaluates the $1'],
				],
			},
			async callback({ args, session }){
				if( !FendWrapper.isInstalledLocally )
					return session.update( '`fend` is not installed or not in the PATH on this machine :(' )

				const expression = args.getRaw()

				if( !expression )
					return session.update( 'Provide an expression to evaluate' )

				try {
					const result = await FendWrapper.evaluate( expression )
					return session.update( `${result}`, { cb: result.includes( '\n' ) && "bash" } )
				} catch( error ) {
					session.update( `Error: ${error.message}` )
				}
			},
		})
	}
}