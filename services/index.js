// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	async init(){
		const { basename } = require( 'path' );
		const client = require( '@/instances/client' )
		const serviceManager = require( '@/instances/service-manager' )
		const includeFiles = require( '@/functions/includeFiles' )

		const thisFileName = basename( __filename )

		// Registering services //
		includeFiles({
			text: '[Index] Initializing services',
			query: 'services/*(.js)?/index.js',
			/**
			 * @param {import('@/libs/service-manager').Inclusion} inclusion
			 * @param {string[]} path
			 * @returns {Promise<void>}
			 */
			callback: async ( inclusion, [, filename] ) => {
				if( filename === thisFileName )
					return

				serviceManager.register( inclusion )
			},
		})

		// Boot enabled services after login //
		client.whenReady.then( async () => {
			await serviceManager.boot()
		})
	}
}