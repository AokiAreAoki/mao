/**
 * @param {Function} listener
 * @param {unknown[]} data
 */
async function invokeAsync( fn, data ){
	return await fn( ...data )
}

module.exports = class EventBroadcaster {
	/** @type {Map<string, Function>} */
	serviceListenerMap = new Map()

	get listenerCount() {
		return this.serviceListenerMap.size
	}

	/**
	 * @param {import('events')} ee
	 * @param {string} event
	 * @param {Map<string, Function>} serviceListenerMap
	 */
	constructor( ee, event ){
		this.ee = ee
		this.event = event

		this.listener = ( ...data ) => {
			for( const [serviceName, listener] of this.serviceListenerMap ){
				invokeAsync( listener, data )
					.catch( error => {
						console.error( `[Service Manager] Event listener of \`${serviceName}\` service for \`${event}\` event failed:\n`, error )
					})
			}
		}

		this.start()
	}

	start(){
		const listeners = this.ee.listeners( this.event )

		if( listeners.every( l => l !== this.listener ) )
			this.ee.on( this.event, this.listener )
	}

	destroy(){
		this.ee.off( this.event, this.listener )
	}

	/**
	 * @param {string} serviceName
	 * @param {Function} callback
	 */
	setServiceListener( serviceName, callback ){
		this.serviceListenerMap.set( serviceName, callback )
	}

	/**
	 * @param {string} serviceName
	 */
	removeServiceListener( serviceName ){
		this.serviceListenerMap.delete( serviceName )
	}
}