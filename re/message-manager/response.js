const transformMessagePayload = require( "../../functions/transformMessagePayload" )

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

		return this.response.update( content )
	}

	cancel(){
		this.#isCanceled = true
	}

	get isCanceled(){
		return this.#isCanceled
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

		return this.message = this.message
			.then( message => this.message = message )
	}
}

module.exports = Response