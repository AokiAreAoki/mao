const handleMessageArgs = require("../../functions/handleMessageArgs")

class ResponseSession {
	response = null
	isDeprecated = false

	constructor( response ){
		this.response = response
	}

	update( content ){
		if( this.isDeprecated )
			return null

		return this.response.update( content )
	}

	deprecate(){
		this.isDeprecated = true
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
		this.#session?.deprecate()
		this.#session = new ResponseSession( this )
	}

	async update( content, options = {} ){
		content = handleMessageArgs( content, options )

		if( this.message instanceof Promise ){
			this.#pendingContent = content

			return this.message
				.then( async message => {
					this.message = message

					if( this.#pendingContent === content ){
						const pendingContent = this.#pendingContent
						this.#pendingContent = null
						this.message = await this.update( pendingContent )
					}

					return this.message
				})
		}

		this.message = this.message && !this.message.deleted
			? this.message.edit( content )
			: this.destination.send( content )

		return this.message
			.then( async message => this.message = message )
	}
}

module.exports = Response