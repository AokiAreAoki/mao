// eslint-disable-next-line no-global-assign
require = global.alias(require)
const Service = require( './Service' )
const StorageAdapter = require( './StorageAdapter' )

module.exports = class ServiceManager {
	/** @type {Map<string, import('./Service')>} */
	services = new Map()

	/** @param {StorageAdapter?} */
	constructor( storageAdapter ) {
		this.storageAdapter = storageAdapter || new StorageAdapter()
	}

	/** @param {import('.').Inclusion} inclusion */
	register( inclusion ){
		const service = new Service( inclusion, this )
		const name = inclusion.name || `Unnamed-Service-${this.services.size + 1}`
		this.services.set( name, service )
	}

	async boot( verbose = false ){
		for (const [name, service] of this.services) {
			const isEnabled = service.alwaysOn || this.storageAdapter.isEnabled(name)

			if( isEnabled ){
				const { succeeded, results } = await service.initialize()

				if( succeeded ){
					service.enable( true )

					if( verbose ){
						console.log( `[Service Manager] \`${name}\` service has been enabled` )
					}
				} else {
					console.warn( `[Service Manager] some prerequisites of \`${name}\` service have failed:` )

					for( const index in results ){
						const { succeeded, error } = results[index]

						if( !succeeded )
							console.warn( ` - prerequisite #${index + 1} failed with:\n`, error )
					}
				}
			}
		}

		if( verbose ){
			const disabledServices = Array
				.from( this.services.keys() )
				.filter( name => !this.storageAdapter.isEnabled(name) )
				.map( name => ` - \`${name}\`` )
				.join( '\n' )

			if( disabledServices )
				console.log( `[Service Manager] disabled services:\n${disabledServices}` )
			else
				console.log( `[Service Manager] no disabled services` )

			console.log( `[Service Manager] booting finished` )
		}
	}
}