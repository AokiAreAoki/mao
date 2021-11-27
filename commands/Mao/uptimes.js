
module.exports = {
	requirements: 'Embed numsplit db',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'uptime',
			description: 'Mao\'s uptime',
			callback: msg => {
				const uptime = new TimeSplitter({
					seconds: Math.floor( process.uptime() ),
				})

				msg.send( 'Uptime: ' + uptime.toString({
					maxTU: 2,
					ignoreZeros: true,
					separator: `, `,
				}))
			},
		})

		addCmd({
			aliases: 'totaluptime',
			description: 'Mao\'s total uptime',
			callback: msg => {
				let totaluptime = db.totaluptime || 1
				let string_time = `${numsplit( Math.floor( totaluptime / 60 / 24 ) )}d = ${numsplit( Math.floor( totaluptime / 6 ) / 10 )}h`
				msg.send( Embed().addField( 'Total uptime', string_time ) )
			},
		})
	}
}
