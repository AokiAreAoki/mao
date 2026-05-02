// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init(){
		const includeFiles = require( '@/functions/includeFiles' )
		const CM = require( '@/instances/command-manager' )
		const MM = require( '@/instances/message-manager' )

		MM.unshiftHandler( 'commands', true, ( ...args ) => CM.handleMessage( ...args ) )

		/// Modules ///
		const folderLookup = new Map()

		includeFiles({
			text: 'Initializing command modules',
			query: 'commands/**/index.js',
			callback: ( settings, [, folder] ) => {
				const module = CM.addModule( settings )
				folderLookup.set( folder, module )
			},
		})

		/// Commands ///
		includeFiles({
			text: 'Initializing commands',
			query: 'commands/**/*(.js)?/index.js',
			callback( inclusion, path ){
				const [, folder, file] = path

				if( file === 'index.js' )
					return

				if( typeof inclusion?.init !== 'function' ){
					setTimeout( () => {
						console.warn( `[Warning] "${path.join( '/' )}" command does not have the init function` )
					}, 1 )

					return
				}

				const module = folderLookup.get( folder )

				if( !module ){
					setTimeout( () => {
						console.warn( `[Warning] "${folder}" module was not initiated` )
					}, 1 )

					return
				}

				inclusion.init({
					addCommand: options => {
						return CM.addCommand({ ...options, module })
					},
				})
			}
		})
	}
}