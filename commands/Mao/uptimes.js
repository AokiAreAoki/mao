
// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { db } = require( '@/instances/bakadb' )
		const Embed = require( '@/functions/Embed' )
		const numsplit = require( '@/functions/numsplit' )
		const TimeSplitter = require( '@/re/time-splitter' )

		addCommand({
			aliases: 'uptime',
			description: 'Mao\'s uptime',
			callback({ session }){
				const uptime = new TimeSplitter({ seconds: Math.floor( process.uptime() ) })
					.toString({
						maxTU: 2,
						ignoreZeros: true,
						separator: `, `,
					})

				session.update( 'Uptime: ' + uptime )
			},
		})

		addCommand({
			aliases: 'totaluptime',
			description: 'Mao\'s total uptime',
			callback({ session }){
				let totaluptime = db.totaluptime || 1
				let string_time = `${numsplit( Math.floor( totaluptime / 60 / 24 ) )}d = ${numsplit( Math.floor( totaluptime / 6 ) / 10 )}h`
				session.update( Embed().addFields({ name: 'Total uptime', value: string_time }) )
			},
		})
	}
}
