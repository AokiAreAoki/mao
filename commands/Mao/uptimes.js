
// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const { db } = require( '@/instances/bakadb' )
		const Embed = require( '@/functions/Embed' )
		const numsplit = require( '@/functions/numsplit' )
		const TimeSplitter = require( '@/re/time-splitter' )

		addCommand({
			aliases: 'uptime',
			description: 'Mao\'s uptime',
			callback: msg => {
				const uptime = new TimeSplitter({
					// eslint-disable-next-line no-undef
					seconds: Math.floor( process.uptime() ),
				}).toString({
					maxTU: 2,
					ignoreZeros: true,
					separator: `, `,
				})

				msg.send( 'Uptime: ' + uptime )
			},
		})

		addCommand({
			aliases: 'totaluptime',
			description: 'Mao\'s total uptime',
			callback: msg => {
				let totaluptime = db.totaluptime || 1
				let string_time = `${numsplit( Math.floor( totaluptime / 60 / 24 ) )}d = ${numsplit( Math.floor( totaluptime / 6 ) / 10 )}h`
				msg.send( Embed().addFields({ name: 'Total uptime', value: string_time }) )
			},
		})
	}
}
