
class Response {
	message = null

	constructor( msgOrChannel ){
		this.channel = msgOrChannel
	}

	async update( content ){
		return this.message
			? this.message.edit( content )
			: this.message = await this.channel.send( content )
	}
}

module.exports = Response