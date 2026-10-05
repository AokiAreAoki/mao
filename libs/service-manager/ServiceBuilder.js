/**
 * @typedef {() => Promise<void>} Action
 *
 * @typedef {Object} ServiceMessageHandler
 * @property {number} priority
 * @property {import("@/libs/message-manager").HandlerCallback} callback
 */

module.exports = class ServiceBuilder {
	/** @type {ServiceMessageHandler?} */
	messageHandler = null

	/** @type {Map<import('events'), Map<string, Function>>} */
	eeEventHandlerMap = new Map()

	/** @type {Action[]} */
	initActions = []

	/** @type {Action[]} */
	onEnableActions = []

	/** @type {Action[]} */
	onDisableActions = []

	/** @type {Record<string, Action>} */
	apiEndpoints = {}

	constructor() {}

	/**
	 * @param {() => Promise<void>} callback
	 */
	onInit( callback ){
		this.initActions.push( callback )
	}

	/**
	 * @param {() => Promise<void>} callback
	 */
	onEnabled( callback ){
		this.onEnableActions.push( callback )
	}

	/**
	 * @param {() => Promise<void>} callback
	 */
	onDisabled( callback ){
		this.onDisableActions.push( callback )
	}

	/**
	 * @typedef {import("events")} EE
	 *
	 * @typedef
	 	{
			<EventMap extends Record<string, any[]>, K extends keyof EventMap>(
				ee: EE<EventMap>,
				eventName: K,
				callback: ( ...args: EventMap[K] ) => void
			) => void
		} OnMethod
	 */

	/** @type {OnMethod} */
	on( ee, eventName, callback ){
		let eeEvents = this.eeEventHandlerMap.get( ee )

		if( !eeEvents ){
			eeEvents = new Map()
			this.eeEventHandlerMap.set( ee, eeEvents )
		}

		eeEvents.set( eventName, callback )
	}

	/**
	 * @param {number} priority
	 * @param {import("@/libs/message-manager").HandlerCallback} callback
	 */
	onMessage( priority, callback ){
		this.messageHandler = { priority, callback }
	}

	api( name, callback ){
		this.apiEndpoints[name] = callback
	}
}