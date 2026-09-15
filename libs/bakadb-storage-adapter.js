// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { StorageAdapter } = require( '@/libs/service-manager' )

module.exports = class BakaDBStorageAdapter extends StorageAdapter {
	/**
	 * @param {import('@/libs/bakadb')} bakadb
	 * @param {string | string[]} path
	 */
	constructor( bakadb, path ){
		super()

		if( !Array.isArray( path ) )
			path = [path]

		this.db = bakadb
		this.path = path
	}

	isEnabled( name ) {
		return this.db.get( ...this.path, name )
	}

	setEnabled( name, isEnabled ){
		this.db.set( ...this.path, name, isEnabled )
		this.db.save()
	}
}