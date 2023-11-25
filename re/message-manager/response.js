
class Response {
	destination = null
	message = null

	constructor( messageOrChannel ){
		this.destination = messageOrChannel
	}

	async update( content ){
		return this.message
			? this.message.edit( content )
			: this.message = await this.destination.send( content )
	}
}

module.exports = Response