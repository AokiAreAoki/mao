// eslint-disable-next-line no-global-assign
require = global.alias(require)

const bakadb = require( '@/instances/bakadb' )

const GLOBAL_KEYWORD = 'global'

function getModuleSettings( module, guildId = GLOBAL_KEYWORD ){
	return bakadb.fallback({
		path: ['modules', guildId, module.name],
		defaultValue: () => ({
			enabled: module.enabledByDefault || guildId === GLOBAL_KEYWORD,
		}),
	})
}

function setModuleSettings( settings, module, guildId = GLOBAL_KEYWORD ){
	bakadb.set( 'modules', guildId, module.name, settings )
}

function modifyModuleSettings( settings, module, guildId = GLOBAL_KEYWORD ){
	bakadb.set( 'modules', guildId, module.name, {
		...getModuleSettings( module, guildId ),
		...settings,
	})
}

module.exports = {
	GLOBAL_KEYWORD,
	getModuleSettings,
	setModuleSettings,
	modifyModuleSettings,
}