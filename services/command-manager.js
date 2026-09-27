// eslint-disable-next-line no-global-assign
require = global.alias(require)

/** @type {import('@/libs/service-manager').Inclusion} */
module.exports = {
	id: "command-manager",
	name: "Command Manager",
	alwaysOn: true,
	init({ sb }){
		const { includeFiles } = require( '@/utils/includeFiles' )
		const CM = require( '@/instances/command-manager' )
		const MESSAGE_HANDLER_PRIORITIES = require( '@/constants/message-handler-priorities' )

		sb.onMessage( MESSAGE_HANDLER_PRIORITIES.COMMAND_MANAGER, msg => CM.handleMessage( msg ) )

		sb.onInit(() => {
			/// Modules ///
			const folderLookup = new Map()

			includeFiles({
				text: '[Command Manager] Initializing command modules',
				query: 'commands/**/index.js',
				callback: ( settings, [, folder] ) => {
					const module = CM.addModule( settings )
					folderLookup.set( folder, module )
				},
			})

			/// Commands ///
			includeFiles({
				text: '[Command Manager] Initializing commands',
				query: 'commands/**/*(.js)?/index.js',
				callback( inclusion, path ){
					const [, moduleFolder, commandFileOrFolder] = path

					if( commandFileOrFolder === 'index.js' )
						return

					if( typeof inclusion?.init !== 'function' ){
						setTimeout( () => {
							console.warn( `[Warning] "${path.join( '/' )}" command does not have the init function` )
						}, 1 )

						return
					}

					const module = folderLookup.get( moduleFolder )

					if( !module ){
						setTimeout( () => {
							console.warn( `[Warning] "${moduleFolder}" module was not initiated` )
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
		})
	}
}