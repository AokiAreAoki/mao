const ServiceBuilder = require( "./ServiceBuilder" )

module.exports = class Service {
	isInitialized = false
	hasFailed = false
	error = null
	isEnabled = false

	/**
	 * @param {import(".").Inclusion} inclusion
	 * @param {import("./ServiceManager")} serviceManager
	 */
	constructor( inclusion, serviceManager ){
		this.id = inclusion.id

		if( !this.id )
			throw Error( "Service `id` is required" )

		this.name = inclusion.name || `Unnamed-Service-${serviceManager.services.size + 1}`
		this.alwaysOn = inclusion.alwaysOn
		this.inclusion = inclusion
		this.serviceManager = serviceManager
	}

	async initialize(){
		if( this.isInitialized )
			throw new Error( "Service has already been initialized." )

		if( this.hasFailed )
			throw new Error( "Service has previously failed to initialize." )

		let succeeded = true
		const sb = new ServiceBuilder()

		try {
			await this.inclusion.init({ sb })

			for( const initAction of sb.initActions ){
				await initAction()
			}
		} catch( error ){
			this.error = error
			succeeded = false
		}

		if( succeeded ) {
			this.isInitialized = true

			this.messageHandler = sb.messageHandler
			this.eeEventHandlerMap = sb.eeEventHandlerMap

			this.onEnableActions = sb.onEnableActions
			this.onDisableActions = sb.onDisableActions
		} else {
			this.hasFailed = true
		}

		this.inclusion = null

		return { succeeded, error: this.error }
	}

	/**
	 * @param {boolean} doNotPersist
	 * @returns {boolean} true on success
	 */
	async enable( doNotPersist = false ){
		if( !this.isInitialized ) return false
		if( this.hasFailed ) return false
		if( this.isEnabled ) return false

		const results = await Promise.allSettled( this.onEnableActions.map( async enableAction => {
			await enableAction()
		}))

		let failed = false

		for( const result of results ){
			if( result.status === 'rejected' ){
				failed = true
				console.warn( `[Service Manager] \`${this.name}\` service startup task failed:\n`, result.reason )
			}
		}

		if( failed )
			return false

		this.isEnabled = true
		this.serviceManager._onEnabled( this, !doNotPersist )

		return true
	}

	/**
	 * @param {boolean} doNotPersist
	 * @returns {boolean} true on success
	 */
	async disable( doNotPersist = false ){
		if( !this.isInitialized ) return false
		if( this.hasFailed ) return false
		if( !this.isEnabled ) return false

		const results = await Promise.allSettled( this.onDisableActions.map( async disableAction => {
			await disableAction()
		}))

		let failed = false

		for( const result of results ){
			if( result.status === 'rejected' ){
				failed = true
				console.warn( `[Service Manager] \`${this.name}\` service shutdown task failed:\n`, result.reason )
			}
		}

		if( failed )
			return false

		this.isEnabled = false
		this.serviceManager._onDisabled( this, !doNotPersist )

		return true
	}
}