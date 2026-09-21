// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	async init(){
		const { flags } = require( '@/index' );
		const { basename } = require( 'path' );
		const client = require( '@/instances/client' )
		const serviceManager = require( '@/instances/service-manager' )
		const { includeFiles, logPush, logPop, logSingle } = require( '@/functions/includeFiles' )

		const thisFileName = basename( __filename )
		const verbose = flags.dev

		// Registering services //
		includeFiles({
			text: '[Index] Registering services',
			query: 'services/*(.js)?/index.js',
			/**
			 * @param {import('@/libs/service-manager').Inclusion} inclusion
			 * @param {string[]} path
			 * @returns {Promise<void>}
			 */
			callback: async ( inclusion, path ) => {
				const [, filename] = path

				if( filename === thisFileName )
					return

				serviceManager.register( inclusion )

				if( verbose ){
					let name = inclusion.name?.trim()
					name &&= `\`${name}\``

					logPush( `${name || 'UNNAMED'} service` )
						if( !name )
							logSingle( '[WARN] unnamed service' )

						logSingle( `from \`${path.join( '/' )}\`` )
					logPop()
				}
			},
		})

		// Boot up enabled services after login //
		client.whenReady.then( async () => {
			if( verbose )
				console.log()

			await serviceManager.boot( verbose )
		})
	}
}