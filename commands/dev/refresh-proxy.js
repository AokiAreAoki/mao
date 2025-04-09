// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { PROXY_TYPES, refreshProxy } = require( '@/instances/proxy' )

		addCommand({
			aliases: 'refresh-proxy',
			description: 'Refresh proxy settings',
			flags: [
				['all', 'refresh all proxy types'],
			],
			async callback({ args, session }){
				const proxyType = args[0]?.toLowerCase()
				const all = args.flags.all.specified

				if( !all && !PROXY_TYPES.has( proxyType ) ){
					const proxyTypes = Array
						.from( PROXY_TYPES )
						.map( type => `\`${type}\`` )
						.join( ', ' )

					return session.update( `Please provide one of proxy types to refresh (${proxyTypes}) or specify \`--all\` flag.` )
				}

				if( all ){
					refreshProxy( 'all' )
					return session.update( `All proxy caches dropped.` )
				}

				refreshProxy( proxyType )
				return session.update( `\`${proxyType}\` proxy cache dropped.` )
			},
		})
	}
}