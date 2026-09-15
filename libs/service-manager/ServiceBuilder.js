module.exports = class ServiceBuilder {
	prerequisites = []
	messageHandler = null
	eventHandlers = {}

	constructor() {}

	/**
	 * @param {() => Promise<void>} callback
	 */
	prerequisite( callback ){
		this.prerequisites.push( callback )
	}

	onMessage( callback ){
		this.messageHandler = callback
	}

	/**
	 * @param {EventEmitter} ee
	 * @param {string} event
	 * @param {Function} callback
	 */
	on( ee, event, callback ){
		this.eventHandlers[ee] ??= {}
		this.eventHandlers[ee][event] = callback
	}
}