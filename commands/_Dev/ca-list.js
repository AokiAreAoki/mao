module.exports = {
	requirements: 'Embed AM bakadb db cb',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'cas',
			description: 'returns list of all CAs',
			flags: [
				['capp', '<CAs per page>', 'how many CAs should be displayed per page`'],
			],
			callback( msg, args ){
				if( !db.customActivities || db.customActivities.length === 0 )
					return msg.send( `There's no custom activities` )

				const CAPP = args.flags.capp[0] || 3 // CAs per page
				const pages = Math.ceil( db.customActivities.length / CAPP )

				const pageHandler = ( page = 0 ) => ({
					embeds: db.customActivities.slice( page * CAPP, ( page + 1 ) * CAPP )
						.map( ( ca, i ) => {
							const t = Math.round( ca.deadline / 1000 )

							return Embed()
								.addField( `Activity`, [
									ca.name ? `Unique Name: ${ca.name}` : `No unique name specified`,
									`Deadline: <t:${t}:d> <t:${t}:t> (<t:${t}:R>)`,
									`Static: ${!!ca.static}`,
								].join( '\n' ) )
								.addField( ca.static ? 'Static value' : 'Callback', cb( ca.static ? ca.invoke() : ca.invoke ) )
								.setFooter( `${i + 1 + page * CAPP}/${db.customActivities.length}` )
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