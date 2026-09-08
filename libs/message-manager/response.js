// eslint-disable-next-line no-global-assign
require = global.alias(require)
const transformMessagePayload = require( "@/functions/transformMessagePayload" )
const wait = require( "@/functions/wait" )

const DISCORD_API_MESSAGE_QUOTA = 5
const DISCORD_API_MESSAGE_QUOTA_TIME_WINDOW = 5e3
const DISCORD_API_MESSAGE_EVEN_INTERVAL = DISCORD_API_MESSAGE_QUOTA_TIME_WINDOW / DISCORD_API_MESSAGE_QUOTA

class ResponseSession {
	response = null
	#isCanceled = false

	constructor( response ){
		this.response = response
	}

	update( content, options = {} ){
		content = transformMessagePayload( content, options )

		if( this.isCanceled )
			return null

		return this.response.update( content, options )
	}

	cancel(){
		this.#isCanceled = true
	}

	get isCanceled(){
		return this.#isCanceled
	}

	/** @typedef {'finished' | 'errored' | 'canceled'} ExitReason */

	/** @param {AsyncGenerator} iter */
	async runSessionCoroutine( iter ){
		/** @type {ExitReason} */
		let reason = 'finished'

		function onError( error ){
			console.error( error )
			this.update( error.stack, { cb: 'js' } )
			reason = 'errored'
			return { done: true }
		}

		do {
			if( this.isCanceled ){
				reason = 'canceled'
				break
			}
		} while( !( await iter.next().catch( onError ) ).done )

		return reason
	}
}

class Response {
	destination = null
	message = null
	#session = null
	#pendingContent = null

	get session(){
		return this.#session
	}

	constructor( messageOrChannel ){
		this.destination = messageOrChannel
		this.resetSession()
	}

	resetSession(){
		this.#session?.cancel()
		this.#session = new ResponseSession( this )
	}

	async update( content, options = {} ){
		const useEvenInterval = !!options?.useEvenInterval

		if( options )
			delete options.useEvenInterval

		content = transformMessagePayload( content, options )

		if( this.message instanceof Promise ){
			this.#pendingContent = content

			return this.message
				.then( () => {
					if( this.#pendingContent === content ){
						const pendingContent = this.#pendingContent
						this.#pendingContent = null
						return this.update( pendingContent )
					}

					return this.message
				})
		}

		this.message = this.message && !this.message.deleted
			? this.message.edit( content )
			: this.destination.send( content )

		if( useEvenInterval ){
			this.message = this.message.then( async message => {
				console.log( `awaiting an even interval: ${DISCORD_API_MESSAGE_EVEN_INTERVAL * 1.5}ms` )
				await wait( DISCORD_API_MESSAGE_EVEN_INTERVAL )
				return this.message = message
			})
		}

		return this.message = this.message
			.then( message => this.message = message )
	}
}

module.exports = Response