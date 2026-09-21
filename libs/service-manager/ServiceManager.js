// eslint-disable-next-line no-global-assign
require = global.alias(require)
const EventBroadcaster = require( './EventBroadcaster' )
const Service = require( './Service' )
const StorageAdapter = require( './StorageAdapter' )
const { logPush, logPop, logFail, logSingle } = require( '@/functions/includeFiles' )

/**
 * @typedef ServiceManagerConstructorParams
 * @property {StorageAdapter} [storageAdapter]
 * @property {import('@/libs/message-manager')} [messageManager]
 */
module.exports = class ServiceManager {
	/** @type {Map<string, import('./Service')>} */
	services = new Map()

	/** @type {Map<import('events'), Map<string, EventBroadcaster>>} */
	eeEventBroadcasterMap = new Map()

	/** @param {ServiceManagerConstructorParams} [params] */
	constructor({
		storageAdapter,
		messageManager,
	} = {}){
		this.storageAdapter = storageAdapter || new StorageAdapter()
		this.messageManager = messageManager || null
	}

	/** @param {import('.').Inclusion} inclusion */
	register( inclusion ){
		const service = new Service( inclusion, this )
		this.services.set( service.id, service )
	}

	/** @param {bool} verbose  */
	async boot( verbose = false ){
		if( verbose ){
			logPush( `[Service Manager] Booting up enabled services` )
		}

		for (const [id, service] of this.services) {
			const isEnabled = this.isEnabled( service )

			if( isEnabled ){
				if( verbose ){
					logPush( `\`${id}\` service` )
				}

				if( verbose ){
					logPush( `initializing` )
				}

				const { succeeded, error } = await service.initialize()

				if( succeeded ){
					logPop()

					if( verbose ){
						logPush( `enabling` )
					}

					const error = await service.start( true )
						.then( () => null )
						.catch( e => e )

					if( verbose ){
						if( error )
							logFail( `\`${id}\` service failed to start up\n` )
						else
							logPop()
					}
				} else if( verbose ){
					logFail( `\`${id}\` service failed to initialize:\n`, error )
				}

				if( verbose ){
					logPop()
				}
			}
		}

		if( verbose ){
			logPop()

			const disabledServices = Array
				.from( this.services.keys() )
				.filter( id => !this.storageAdapter.isEnabled( id ) )
				.map( name => ` - \`${name}\`` )
				.join( '\n' )

			if( disabledServices )
				logSingle( `[Service Manager] disabled services:\n${disabledServices}` )
			else
				logSingle( `[Service Manager] no disabled services` )

			logSingle( `[Service Manager] booting finished` )
		}
	}

	// Toggle Management //

	/** @param {import('./Service') | string} serviceOrId */
	isEnabled( serviceOrId ){
		const service = serviceOrId instanceof Service
			? serviceOrId
			: this.services.get( serviceOrId )

		if( !service )
			throw Error( `Service \`${serviceOrId}\` not found` )

		return service.alwaysOn || this.storageAdapter.isEnabled( service.id )
	}

	/**
	 * @param {import('./Service')} service
	 * @param {boolean} isEnabled
	 */
	setEnabled( service, isEnabled ){
		this.storageAdapter.setEnabled( service.id, isEnabled )
	}

	// Listeners //

	/** @param {import('./Service')} service */
	_registerListeners( service ){
		this._registerEventHandlers( service )
		this._registerMessageHandler( service )
	}

	/** @param {import('./Service')} service */
	_unregisterListeners( service ){
		this._unregisterEventHandlers( service )
		this._unregisterMessageHandler( service )
	}

	// Event Handlers Management //

	/** @param {import('./Service')} service */
	_registerEventHandlers( service ){
		for( const [ee, eeEvents] of service.eeEventHandlerMap ){
			let eventBroadcasterMap = this.eeEventBroadcasterMap.get( ee )

			if( !eventBroadcasterMap ){
				eventBroadcasterMap = new Map()
				this.eeEventBroadcasterMap.set( ee, eventBroadcasterMap )
			}

			for( const [eventName, callback] of eeEvents ){
				let broadcaster = eventBroadcasterMap.get( eventName )

				if( !broadcaster ){
					broadcaster = new EventBroadcaster( ee, eventName )
					eventBroadcasterMap.set( eventName, broadcaster )
				}

				broadcaster.setServiceListener( service.name, callback )
			}
		}
	}

	/** @param {import('./Service')} service */
	_unregisterEventHandlers( service ){
		for( const [ee, eeEvents] of service.eeEventHandlerMap ){
			const eventBroadcasterMap = this.eeEventBroadcasterMap.get( ee )
			if( !eventBroadcasterMap ) continue

			for( const eventName of eeEvents.keys() ){
				let broadcaster = eventBroadcasterMap.get( eventName )
				if( !broadcaster ) continue

				broadcaster.removeServiceListener( service.name )

				if( broadcaster.listenerCount === 0 ){
					broadcaster.destroy()
					eventBroadcasterMap.delete( eventName )
				}
			}

			if( eventBroadcasterMap.size === 0 )
				this.eeEventBroadcasterMap.delete( ee )
		}
	}

	// Message Manager Queue Management //

	/** @param {import('./Service')} service */
	_registerMessageHandler( service ){
		const mh = service.messageHandler

		if( mh )
			this.messageManager.setHandler( service.name, mh.priority, mh.callback )
	}

	/** @param {import('./Service')} service */
	_unregisterMessageHandler( service ){
		if( service.messageHandler )
			this.messageManager.removeHandler( service.name )
	}
}