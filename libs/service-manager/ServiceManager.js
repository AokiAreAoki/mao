// eslint-disable-next-line no-global-assign
require = global.alias(require)
const EventBroadcaster = require( './EventBroadcaster' )
const Service = require( './Service' )
const StorageAdapter = require( './StorageAdapter' )
const printify = require( '@/libs/printify' )

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
	register( inclusion, verbose = false ){
		const service = new Service( inclusion, this )
		this.services.set( service.id, service )

		if( verbose ){
			console.log( `[Service Manager] \`${service.id}\` service has been registered` )

			console.log( `- id: \`${service.id}\`` )
			console.log( `- name: \`${service.name}\`` )
			console.log( `- should be enabled: ${
				service.alwaysOn ? 'alwaysOn' : this.storageAdapter.isEnabled( service.id )
			}` )
		}
	}

	async boot( verbose = false ){
		for (const [id, service] of this.services) {
			const isEnabled = service.alwaysOn || this.storageAdapter.isEnabled( id )

			if( isEnabled ){
				const { succeeded, error } = await service.initialize()

				if( succeeded ){
					console.log( `[Service Manager] \`${id}\` service initialized` )
					console.log( `- eeEventHandlerMap:`, printify( service.eeEventHandlerMap ) )
					console.log( `- messageHandler:`, service.messageHandler )

					service.enable( true )

					if( verbose ){
						console.log( `[Service Manager] \`${id}\` service enabled` )
					}
				} else {
					console.warn( `[Service Manager] \`${id}\` service failed to initialize:\n`, error )
				}
			}
		}

		if( verbose ){
			const disabledServices = Array
				.from( this.services.keys() )
				.filter( id => !this.storageAdapter.isEnabled( id ) )
				.map( name => ` - \`${name}\`` )
				.join( '\n' )

			if( disabledServices )
				console.log( `[Service Manager] disabled services:\n${disabledServices}` )
			else
				console.log( `[Service Manager] no disabled services` )

			console.log( `[Service Manager] booting finished` )
		}
	}

	// Toggle Management //

	/**
	 * @param {import('./Service')} service
	 * @param {boolean} doPersist
	 */
	_onEnabled( service, doPersist ){
		if( doPersist )
			this.storageAdapter.setEnabled( service.id, true )

		this._registerEventHandlers( service )
		this._registerMessageHandler( service )
	}

	/**
	 * @param {import('./Service')} service
	 * @param {boolean} doPersist
	 */
	_onDisabled( service, doPersist ){
		if( doPersist )
			this.storageAdapter.setEnabled( service.id, false )

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

			for( const eventName of eeEvents.keys() ){
				let broadcaster = eventBroadcasterMap.get( eventName )

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