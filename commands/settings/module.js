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

		function statusEmoji( isEnabled ){
			return isEnabled ? '✅' : '❌'
		}

		function listModules( modules, guildId ){
			const toggleableModules = modules
				.filter( module => !module.isDev && !module.isAlwaysEnabled )

			const list = toggleableModules.map( module => {
				const globalSettings = getModuleSettings( module )
				const guildSettings = getModuleSettings( module, guildId )

				const suffix = !globalSettings.enabled && guildId !== GLOBAL_KEYWORD
					? " (disabled globally)"
					: ""

				return `- ${statusEmoji( globalSettings.enabled && guildSettings.enabled )} - \`${module.printname}\`${suffix}`
			})

			return [{
				name: 'Modules:',
				value: list.join( '\n' ) || "No modules",
			}]
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
						? "Global settings"
						: "Guild settings"
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
				const isGlobal = args.flags.global.specified
				const guildId = isGlobal
					? GLOBAL_KEYWORD
					: msg.guild.id

				if( isGlobal ){
					if( !msg.author.isMaster() )
						return session.update( `You can not manage global settings` )
				} else {
					if( !hasPermission( msg.member ) )
						return session.update( `You can not manage this guild` )
				}

				const [moduleName, state] = args
				const module = CM.modules.get( moduleName.toLowerCase() )

				if( !module )
					return session.update( `Unknown module: \`${moduleName}\`` )

				if( module.isDev || module.isAlwaysEnabled )
					return session.update( `This module can not be toggled` )

				if( !state )
					return session.update( `Please specify a state: \`ON\` or \`OFF\`` )

				const upperCasedState = state.toUpperCase()

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
