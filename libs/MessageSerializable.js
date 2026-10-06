const { Message, TextChannel } = require( 'discord.js' )

/**
 * @typedef {import('discord.js').Client} Client
 * @typedef {import('discord.js').Message} Message
 */

class MessageSerializable {
	/** @type {Client} */
	static client = null

	/** @param {Client} */
	static setClient( client ){
		this.client = client
	}

	/** @type {Message | null | undefined} */
	_message = undefined

	/** @param { Pick<Message, 'id' | 'channelId'>} messageResolvable */
	constructor( messageResolvable ){
		this.id = messageResolvable.id
		this.channelId = messageResolvable.channelId

		if( messageResolvable instanceof Message )
			this._message = messageResolvable
	}

	/**
	 * @param { Client } [client=null]
	 * @returns { Promise<Message> }
	 */
	async deserialize( client = null ){
		client ||= MessageSerializable.client

		if( !client )
			throw new Error( 'No client provided for deserialization' )

		if( this._message instanceof Promise )
			return this._message

		return this._message ??= client.channels
			.fetch( this.channelId )
			.then( c => c instanceof TextChannel
				? c.messages.fetch( this.id )
				: null
			)
			.then( m => this._message = m )
	}
}

module.exports = MessageSerializable