// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { StorageAdapter } = require( '@/libs/service-manager' )

const SERVICES_LIST = `services`
const ENABLED_PROPERTY = `enabled`

module.exports = class BakaDBStorageAdapter extends StorageAdapter {
	/**
	 * @param {import('@/libs/bakadb')} bakadb
	 * @param {string | string[]} location
	 */
	constructor( bakadb, location ){
		super()

		if( !Array.isArray( location ) )
			location = [location]

		this.db = bakadb
		this.location = location
	}

	isEnabled( serviceId ) {
		return this.db.fallback({
			path: [...this.location, SERVICES_LIST, serviceId, ENABLED_PROPERTY],
			defaultValue: () => true,
		})
	}

	setEnabled( serviceId, isEnabled ){
		this.db.set( ...this.location, SERVICES_LIST, serviceId, ENABLED_PROPERTY, isEnabled )
		this.db.save()
	}
}