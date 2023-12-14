/**
 * @typedef {Object} ErrorEntry
 * @property {number} count
 * @property {number} nextMessage
 * @property {NodeJS.Timeout | null} [timeout]
 * @property {Promise<import('discord.js').Message | null>} [message]
 */

// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init(){
		const { Events } = require( 'discord.js' )
		const client = require( '@/instances/client' )
		const config = require( '@/config.yml' )
		const cb = require( '@/functions/cb' )
		const Embed = require( '@/functions/Embed' )

		const ERROR_EVENTS = ['uncaughtException', 'unhandledRejection']
		const MESSAGE_INTERVAL = 3e3

		/** @type {Record<string, ErrorEntry>} */
		const errors = {}

		function sendError( rejection ){
			const id = String( rejection )

			errors[id].nextMessage = Date.now() + MESSAGE_INTERVAL

			return client.channels.fetch( config.log_channel )
				.then( async channel => {
					const message = await errors[id].message
					message?.delete()

					const embed = Embed().addFields({
						name: `Unhandled rejection: (x${errors[id].count})`,
						value: cb( rejection.stack ),
					})

					errors[id].message = channel.send( embed )
						.then( message => errors[id].message = message )
				})
				.catch( console.error )
		}

		function onError( prefix ){
			return async error => {
				if( error.message?.toLowerCase() === 'unknown message' )
					return

				process.stdout.write( `[${prefix}] ` )
				console.error( error )

				if( !config.log_channel )
					return console.log( '`log_channel` is not specified in config' )

				const id = String( error )

				if( errors[id] ){
					++errors[id].count
				} else {
					errors[id] = {
						count: 1,
						nextMessage: 0,
						timeout: null,
						message: null,
					}
				}

				if( errors[id].nextMessage < Date.now() ){
					sendError( error )
					return
				}

				errors[id].timeout ??= setTimeout( () => {
					errors[id].timeout = null
					sendError( error )
				}, MESSAGE_INTERVAL )
			}
		}

		client.once( Events.ClientReady, () => {
			ERROR_EVENTS.forEach( event => {
				process.on( event, onError( event ) )
			})
		})
	}
}