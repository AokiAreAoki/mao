// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const { Events } = require( 'discord.js' )
		const client = require( '@/instances/client' )
		const config = require( '@/config.yml' )
		const cb = require( '@/functions/cb' )
		const Embed = require( '@/functions/Embed' )

		client.once( Events.ClientReady, () => {
			const URs = {} // Unhandled Rejections

			function sendUnhandledRejection( rejection ){
				const ur = String( rejection )

				client.channels.fetch( config.log_channel )
					.then( channel => {
						URs[ur].messagePromise?.then( m => m.delete() )
						URs[ur].messagePromise = channel.send( Embed()
							.addFields({
								name: `Unhandled rejection: (x${URs[ur].time})`,
								value: cb( rejection.stack ),
							})
						)
					})
					.catch( console.error )
			}

			// eslint-disable-next-line no-undef
			process.on( 'unhandledRejection', async rejection => {
				if( rejection.message === 'Unknown Message' )
					return

				console.log( 'Unhandled rejection:', rejection.stack )

				if( !config.log_channel )
					return console.log( '`log_channel` is not specified in config' )

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
	}
}