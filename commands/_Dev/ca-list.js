// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const Embed = require( '@/functions/Embed' )
		const bakadb = require( '@/instances/bakadb' )
		const { db } = bakadb
		const cb = require( '@/functions/cb' )

		addCommand({
			aliases: 'cas',
			description: 'returns list of all CAs',
			flags: [
				['capp', '<CAs per page>', 'how many CAs should be displayed per page`'],
			],
			callback( msg, args ){
				if( !db.customActivities || db.customActivities.length === 0 )
					return msg.send( `There's no custom activities` )

				const CAPP = ( args.flags.capp.specified && args.flags.capp[0] ) || 5 // CAs per page
				const pages = Math.ceil( db.customActivities.length / CAPP )

				const pageHandler = ( page = 0 ) => ({
					embeds: db.customActivities.slice( page * CAPP, ( page + 1 ) * CAPP )
						.map( ( ca, i ) => {
							const t = Math.round( ca.deadline / 1000 )

							return Embed()
								.addFields(
									{
										name: `Activity`,
										value: [
											ca.name ? `Unique name: ${ca.name}` : `No unique name specified`,
											`Type: ${ca.type}`,
											`Static: ${!!ca.static}`,
											`Deadline: <t:${t}:d> <t:${t}:t> (<t:${t}:R>)`,
										].join( '\n' ),
									},
									{
										name: ca.static ? 'Static value' : 'Callback',
										value: cb( ca.static ? ca.string : ca.callback ),
									},
								)
								.setFooter({
									text: `${i + 1 + page * CAPP}/${db.customActivities.length}`
								})
						})
				})

				if( pages === 1 )
					return msg.send( pageHandler() )

				msg.author.createPaginator()
					.setPages( pages )
					.onPageChanged( pageHandler )
					.createMessage( msg )
			}
		})
	}
}
