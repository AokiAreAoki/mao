// eslint-disable-next-line no-global-assign
require = global.alias(require)

const Logger = require( "@/utils/logger" )
const ServiceBuilder = require( "./ServiceBuilder" )

module.exports = class Service {
	hasInitialized = false
	hasFailed = false
	isLaunched = false
	error = null

	get isEnabled() {
		return this.serviceManager.isEnabled( this )
	}

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

		this.logger = new Logger( ['Service', this.name] )
	}

	async initialize(){
		if( this.hasInitialized )
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

			this.hasInitialized = true

			this.messageHandler = sb.messageHandler
			this.eeEventHandlerMap = sb.eeEventHandlerMap

			this.startupTasks = sb.onEnableActions
			this.shutdownTasks = sb.onDisableActions
		} catch( error ){
			this.hasFailed = true
			this.error = error

			succeeded = false
		}

		this.inclusion = null

		return { succeeded, error: this.error }
	}

	/** @returns {boolean} true on success */
	async start(){
		if( !this.hasInitialized ) return false
		if( this.hasFailed ) return false
		if( this.isLaunched ) return false

		for( const startupTask of this.startupTasks ){
			try {
				await startupTask()
			} catch( error ){
				this.logger.error( `startup task failed:\n`, error )

				for( const shutdownTask of this.shutdownTasks ){
					try {
						await shutdownTask()
					} catch( err ){
						this.logger.error( `cleanup after failed startup task also failed:\n`, err )
					}
				}

				this.hasFailed = true
				this.error = error

				throw new Error( `Service \`${this.name}\` failed to startup: ${error.message || error}` )
			}
		}

		this.isLaunched = true
		this.serviceManager._registerListeners( this )

		return true
	}

	/** @returns {boolean} true on success */
	async stop(){
		if( !this.hasInitialized ) return false
		if( this.hasFailed ) return false
		if( !this.isLaunched ) return false

		for( const disableAction of this.shutdownTasks ){
			try {
				await disableAction()
			} catch( error ){
				this.logger.error( `shutdown task failed:\n`, error )

				this.hasFailed = true
				this.error = error

				throw new Error( `Service \`${this.name}\` failed to shutdown: ${error.message || error}` )
			}
		}

		this.isLaunched = false
		this.serviceManager._unregisterListeners( this )

		return true
	}
}