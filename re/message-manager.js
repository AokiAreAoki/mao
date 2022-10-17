const discord = require( 'discord.js' )
const { Collection } = discord

function listTypes( types ){
	types = types.map( type => type?.name ?? String( type ) )
	const lastType = types.pop()

	if( types.length !== 0 )
		return `${types.join( ', ' )} or ${lastType}`

	return lastType
}

function checkTypes( variables, types, throwError = false ){
	if( !( types instanceof Array ) )
		types = [types]

	for( let name in variables ){
		const value = variables[name]

		if( types.every( type => {
			if( typeof type === 'string' ){
				if( typeof value !== type )
					return true
			} else if( !( value instanceof type ) )
				return true

			return false
		}) ){
			if( throwError )
				throw TypeError( `arg ${name} expected to be an instance of a ${listTypes( types )}, got ${value?.constructor.name ?? typeof value}` )

			return false
		}
	}

	return true
}

class MessageManager {
	client
	handleEdits
	handleDeletion
	handlers = []

	constructor({
		client,
		handleEdits = false,
		handleDeletion = false,
	}){
		this.client = client
		this.handleEdits = !!handleEdits
		this.handleDeletion = !!handleDeletion

		discord.Message.prototype.deleteAnswers = async function(){
			if( this._answers instanceof Collection )
				if( this._answers.size !== 0 ){
					const promise = this.channel.bulkDelete( this._answers.filter( m => !m.deleted ) )
					this._answers.clear()
					return promise
				}
			else
				this._answers = new Collection()
		}

		this.setupEventHandlers()
	}

	setupEventHandlers(){
		this.client.on( 'messageCreate', msg => this.handleMessage( msg, false ) )

		if( this.handleEdits )
			this.client.on( 'messageUpdate', ( oldMsg, newMsg ) => {
				if( oldMsg.content !== newMsg.content ){
					newMsg.waiter?.cancel()
					newMsg.deleteAnswers()
					newMsg.hasBeenEdited = true
					this.handleMessage( newMsg, true )
				}
			})

		if( this.handleDeletion )
			this.client.on( 'messageDelete', msg => {
				msg.waiter?.cancel()
				msg.deleteAnswers()
				msg.deleted = true
			})

	}

	pushHandler( name, markMessagesAsCommand, callback ){
		this.handlers.push( new Handler( name, markMessagesAsCommand, callback ) )
	}

	unshiftHandler( name, markMessagesAsCommand, callback ){
		this.handlers.unshift( new Handler( name, markMessagesAsCommand, callback ) )
	}

	replaceHandler( name, markMessagesAsCommand, callback ){
		const index = this.handlers.findIndex( h => h.name === name )

		if( index === -1 )
			return false

		this.handlers[index] = new Handler( name, markMessagesAsCommand, callback )
		return true
	}

	async handleMessage( message, hasBeenEdited = false ){
		if( !hasBeenEdited )
			message._answers = new Collection()

		message.isCommand = false

		if( ResponseWaiter.handleMessage( message ) )
			return

		for( let i = 0; i < this.handlers.length; ++i ){
			const handler = this.handlers[i]

			if( await handler.callback( message ) ){
				if( handler.isCommandHandler )
					message.isCommand = true

				break
			}
		}
	}
}

function Handler( name, markMessagesAsCommand, callback ){
	checkTypes( { name }, 'string' )
	checkTypes( { callback }, 'function' )

	this.name = name
	this.markMessagesAsCommand = !!markMessagesAsCommand
	this.callback = callback
}

class ResponseWaiter {
	/// Static ///
	static interval = null
	static collectGarbage = false
	static waiters = []

	static {
		discord.Message.prototype.awaitResponse = function( options ){
			options = options ?? {}
			options.invokerMessage = this
			return new ResponseWaiter( options )
		}

		Object.defineProperty( discord.Message.prototype, 'waiter', {
			get: function(){
				return this.responseWaiter = this.responseWaiter ?? ResponseWaiter.find( this.author, this.channel )
			},
			set: function( waiter ){
				if( !checkTypes( { waiter }, ResponseWaiter ) )
					throw TypeError( 'waiter property must be an instance of ResponseWaiter' )

				this.responseWaiter = waiter
			},
		})

		let closestTimeout = 0

		clearInterval( ResponseWaiter.interval )
		ResponseWaiter.interval = setInterval( () => {
			const now = Date.now()

			if( closestTimeout < now && ResponseWaiter.waiters.length !== 0 ){
				closestTimeout = 0

				ResponseWaiter.waiters.forEach( waiter => {
					if( waiter.finished )
						return

					if( waiter.deadline <= now )
						return waiter.timeout()

					if( closestTimeout > waiter.deadline || closestTimeout === 0 )
						closestTimeout = waiter.deadline
				})
			}

			if( ResponseWaiter.collectGarbage ){
				ResponseWaiter.collectGarbage = false
				ResponseWaiter.waiters = ResponseWaiter.waiters.filter( w => !w.finished )
			}
		}, 228 )
	}

	static find( user, channel ){
		return ResponseWaiter.waiters.find( waiter => ( waiter.user ?? waiter.invokerMessage.author ).id === user.id && waiter.invokerMessage.channel.id === channel.id && !waiter.finished )
	}

	static handleMessage( message ){
		const waiter = ResponseWaiter.find( message.author, message.channel )

		if( waiter )
			return waiter.handleResponse( message )

		return false
	}

	/// Instance ///
	deadline
	finished = false
	callbacks = {
		filter: () => true,
		message: ( message, waiter ) => waiter.stop(),
		timeout: () => {},
		cancel: () => {},
	}

	constructor({
		user,
		invokerMessage,
		displayMessage,
		timeout,
	}){
		if( !ResponseWaiter.initialized )
			throw Error( `ResponseWaiter must be initialized first` )

		checkTypes( { invokerMessage }, discord.Message, true )
		checkTypes( { displayMessage }, [discord.Message, 'undefined'], true )

		this.user = user
		this.invokerMessage = invokerMessage
		this.displayMessage = displayMessage
		this.deadline = Date.now() + ( typeof timeout === 'number' ? timeout * 1e3 : 30e3 )

		invokerMessage.waiter?.cancel()
		invokerMessage.waiter = this
		ResponseWaiter.waiters.push( this )
	}

	// Handler setters
	if( filter ){
		checkTypes( { filter }, 'function', true )
		this.callbacks.filter = filter
		return this
	}

	then( messageHandler ){
		checkTypes( { messageHandler }, 'function', true )
		this.callbacks.message = messageHandler
		return this
	}

	onTimeout( timeoutHandler ){
		checkTypes( { timeoutHandler }, 'function', true )
		this.callbacks.timeout = timeoutHandler
		return this
	}

	onCancel( cancelationHandler ){
		checkTypes( { cancelationHandler }, 'function', true )
		this.callbacks.cancel = cancelationHandler
		return this
	}

	// Event Triggers
	handleResponse( message ){
		if( this.callbacks.filter( message ) ){
			this.callbacks.message( message, this )
			return true
		}

		return false
	}

	stop(){
		if( this.finished )
			return false

		this.finished = true
		ResponseWaiter.collectGarbage = true
		return true
	}

	timeout(){
		if( this.stop() ){
			this.callbacks.timeout( this )
			const msg = this.displayMessage

			if( msg instanceof discord.Message && !msg.deleted )
				msg.edit({ content: '**Timed out**', embeds: [] })
					.then( m => m.delete( 1337 ) )
		}
	}

	cancel(){
		if( this.stop() ){
			this.callbacks.cancel( this )
			const msg = this.displayMessage

			if( msg instanceof discord.Message && !msg.deleted )
				msg.edit({ content: '**Canceled**', embeds: [] })
					.then( m => m.delete( 1337 ) )
		}
	}

	toString(){
		return `[an instance of ResponseWaiter of Message(${this.invokerMessage.id})]`
	}
}

MessageManager.ResponseWaiter = ResponseWaiter
module.exports = MessageManager