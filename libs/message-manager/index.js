// eslint-disable-next-line no-global-assign
require = global.alias(require)
const discord = require( 'discord.js' )
const Response = require( './response' )
const binarySearch = require( '@/utils/binarySearch' );

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
		const nonePass = types.every( type => {
			if( typeof type === 'string' ){
				if( typeof value !== type )
					return true
			} else if( !( value instanceof type ) )
				return true

			return false
		})

		if( nonePass ){
			if( throwError )
				throw TypeError( `arg ${name} expected to be an instance of a ${listTypes( types )}, got ${value?.constructor.name ?? typeof value}` )

			return false
		}
	}

	return true
}

/**
 * @typedef {(msg: discord.Message) => unknown} HandlerCallback
 */

class MessageManager {
	/** @type {discord.Client} */
	client

	/** @type {boolean} */
	handleEdits

	/** @type {boolean} */
	handleDeletion

	/** @type {Handler[]} */
	handlers = []

	constructor({
		client,
		handleEdits = false,
		handleDeletion = false,
		metaDataStore,
	}){
		this.client = client
		this.handleEdits = !!handleEdits
		this.handleDeletion = !!handleDeletion
		this.metaDataStore = metaDataStore

		discord.Message.prototype.deleteAnswers = async function(){
			const md = metaDataStore.resolve( this, 'answers' )

			if( !md )
				return

			if( md.answers.length === 0 )
				return

			const answers = await Promise.all( Object.values( md.answers ).map( m => m.deserialize() ) )
			const messagesToDelete = answers.filter( m => !m.deleted )
			const promise = this.channel.bulkDelete( messagesToDelete )

			md.answers = {}

			return promise
		}

		this.setupEventHandlers()
	}

	setupEventHandlers(){
		this.client.on( discord.Events.MessageCreate, msg => {
			this.handleMessage( msg, false )
		})

		if( this.handleEdits )
			this.client.on( discord.Events.MessageUpdate, ( oldMsg, newMsg ) => {
				if( oldMsg.content !== newMsg.content ){
					oldMsg.waiter?.cancel()
					oldMsg.response?.resetSession()

					newMsg.hasBeenEdited = true
					this.handleMessage( newMsg, true )
				}
			})

		if( this.handleDeletion )
			this.client.on( discord.Events.MessageDelete, msg => this.handleMessageDeletion( msg ) )
	}

	/**
	 * @param {string} name
	 * @param {boolean} priority
	 * @param {HandlerCallback} callback
	 */
	setHandler( name, priority, callback ){
		this.removeHandler( name )

		const index = binarySearch( this.handlers, priority, h => h.priority )
		this.handlers.splice( index, 0, new Handler( name, priority, callback ) )
	}

	/**
	 * @param {string} name
	 * @param {boolean} priority
	 * @param {HandlerCallback} callback
	 */
	removeHandler( name ){
		this.handlers = this.handlers.filter( h => h.name !== name )
	}

	async handleMessage( message, hasBeenEdited = false ){
		this.attachResponseInstance( message )

		const hasBeenHandledByWaiter = ResponseWaiter.handleMessage( message )

		if( hasBeenHandledByWaiter )
			return true

		for( let i = 0; i < this.handlers.length; ++i ){
			const handler = this.handlers[i]

			if( await handler.callback( message ) )
				return true
		}

		message.deleteAnswers()

		return false
	}

	async handleMessageDeletion( msg ){
		msg.waiter?.cancel()
		msg.response?.resetSession()
		await msg.deleteAnswers()
		msg.deleted = true
	}

	attachResponseInstance( message ){
		message.response ??= new Response( message, this.metaDataStore )
	}
}

/**
 * @typedef {object} Handler
 * @prop {string} name
 * @prop {number} priority
 * @prop {HandlerCallback} callback
 */
function Handler( name, priority, callback ){
	checkTypes( { name }, 'string' )
	checkTypes( { callback }, 'function' )

	this.name = name
	this.priority = priority
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
				msg.edit({ content: '**Timed out**' })
					.then( m => m.delete( 1337 ) )
		}
	}

	cancel(){
		if( this.stop() ){
			this.callbacks.cancel( this )
			const msg = this.displayMessage

			if( msg instanceof discord.Message && !msg.deleted )
				msg.edit({ content: '**Canceled**' })
					.then( m => m.delete( 1337 ) )
		}
	}

	toString(){
		return `[an instance of ResponseWaiter of Message(${this.invokerMessage.id})]`
	}
}

MessageManager.ResponseWaiter = ResponseWaiter
module.exports = MessageManager