const ServiceBuilder = require( "./ServiceBuilder" )

module.exports = class Service {
	isInitialized = false
	hasFailed = false
	isEnabled = false

	/**
	 * @param {import(".").Inclusion} inclusion
	 * @param {import("./ServiceManager")} serviceManager
	 */
	constructor( inclusion, serviceManager ){
		this.name = inclusion.name
		this.alwaysOn = inclusion.alwaysOn
		this.inclusion = inclusion
		this.serviceManager = serviceManager
	}

	async initialize(){
		if( this.isInitialized )
			throw new Error( "Service has already been initialized." )

		if( this.hasFailed )
			throw new Error( "Service has previously failed to initialize." )

		const sb = new ServiceBuilder()

		this.inclusion.init({ sb })

		const results = await Promise.all( sb.prerequisites.map( async cb => {
			const result = {
				succeeded: false,
				error: null,
				cb,
			}

			try {
				await cb()
				result.succeeded = true
			} catch( error ) {
				result.succeeded = false
				result.error = error
			}

			return result
		}) )

		const succeeded = results.every( r => r.succeeded )

		if( succeeded )
			this.isInitialized = true
		else
			this.hasFailed = true

		this.inclusion = null

		return { succeeded, results }
	}

	/**
	 * @param {boolean} doNotPersist
	 * @returns {boolean} true on success
	 */
	enable( doNotPersist = false ){
		if( !this.isInitialized ) return false
		if( this.hasFailed ) return false
		if( this.isEnabled ) return false

		this.isEnabled = true

		if( !doNotPersist )
			this.serviceManager.storageAdapter.setEnabled( this.isEnabled )

		return true
	}

	/**
	 * @param {boolean} doNotPersist
	 * @returns {boolean} true on success
	 */
	disable( doNotPersist = false ){
		if( !this.isInitialized ) return false
		if( this.hasFailed ) return false
		if( !this.isEnabled ) return false

		this.isEnabled = false

		if( !doNotPersist )
			this.serviceManager.storageAdapter.setEnabled( this.isEnabled )

		return true
	}
}