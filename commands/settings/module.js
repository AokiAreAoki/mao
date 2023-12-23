// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { PermissionFlagsBits } = require( 'discord.js' )
		const Embed = require( '@/functions/Embed' )
		const bakadb = require( '@/instances/bakadb' )
		const CM = require( '@/instances/command-manager' )
		const {
			GLOBAL_KEYWORD,
			getModuleSettings,
			modifyModuleSettings,
		} = require( '@/functions/getModuleSettings' )

		const NONE = 'None'

		function list( modules ){
			return modules
				.map( module => `\`${module.printname}\`` )
				.join( ', ' ) || NONE
		}

		function listModules( modules, guildId ){
			const toggleableModules = modules
				.filter( module => !module.isDev && !module.isAlwaysEnabled )

			const disabledModules = []
			const globallyDisabledModules = []

			const enabledModules = toggleableModules.filter( module => {
				const globalSettings = getModuleSettings( module )
				const guildSettings = getModuleSettings( module, guildId )

				if( globalSettings.enabled && guildSettings.enabled )
					return true

				if( !globalSettings.enabled && guildId !== GLOBAL_KEYWORD )
					globallyDisabledModules.push( module )
				else
					disabledModules.push( module )

				return false
			})

			return [
				{
					name: 'Enabled:',
					value: list( enabledModules ),
				},
				{
					name: 'Disabled:',
					value: list( disabledModules ),
				},
				globallyDisabledModules.length !== 0 && {
					name: 'Globally disabled:',
					value: list( globallyDisabledModules ),
				},
			].filter( Boolean )
		}

		function hasPermission( member ){
			return member && ( member.permissions.has( PermissionFlagsBits.ManageGuild, true ) || member.user.isMaster() )
		}

		const root = addCommand({
			aliases: 'modules module',
			description: {
				single: 'lists modules',
			},
			flags: [
				['global', 'lists global settings'],
			],
			callback({ msg, args, session }){
				const isGlobal = args.flags.global.specified
				const guildId = isGlobal
					? GLOBAL_KEYWORD
					: msg.guild.id

				return session.update( Embed()
					.setTitle( isGlobal
						? 'Global settings'
						: 'Guild settings'
					)
					.addFields( listModules( CM.modules, guildId ) )
				)
			},
		})

		root.addSubcommand({
			aliases: 'toggle',
			description: {
				single: 'toggles modules',
				usages: [
					['<module>', '<on/off>', 'turns $1 on or off'],
				],
			},
			flags: [
				['global', 'changes global settings'],
			],
			callback({ msg, args, session }){
				if( !hasPermission( msg.member ) )
					return session.update( `You can not manage this guild` )

				const [moduleName, state] = args
				const module = CM.modules.get( moduleName.toLowerCase() )

				if( !module )
					return session.update( `Unknown module: \`${moduleName}\`` )

				if( module.isDev || module.isAlwaysEnabled )
					return session.update( `This module can not be toggled` )

				if( !state )
					return session.update( `Please specify a state: \`ON\` or \`OFF\`` )

				const upperCasedState = state.toUpperCase()
				const isGlobal = args.flags.global.specified
				const guildId = isGlobal
					? GLOBAL_KEYWORD
					: msg.guild.id

				switch( upperCasedState ){
					case 'ON':
					case 'OFF': {
						modifyModuleSettings( { enabled: upperCasedState === 'ON' }, module, guildId )
						bakadb.save()

						const globally = isGlobal ? ' globally' : ''
						return session.update( `Module \`${module.printname}\` has been turned \`${upperCasedState}\`${globally}` )
					}

					default:
						return session.update( `Unknown state \`${state}\`. Valid states are \`ON\` and \`OFF\`` )
				}
			},
		})
	}
}
