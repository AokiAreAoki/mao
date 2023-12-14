// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init(){
		const { Events } = require( 'discord.js' )
		const timer = require( '@/re/timer' )
		const { db } = require( '@/instances/bakadb' )
		const client = require( '@/instances/client' )

		const interval = 30

		client.on( Events.ShardReady, () => {
			timer.create( 'totaluptime', interval, 0, () => {
				db.totaluptime = Math.round( ( ( db.totaluptime ?? 0 ) + interval / 60 ) * 10 ) / 10
			})
		})

		client.on( Events.Invalidated, () => timer.remove( 'totaluptime' ) )
	}
}