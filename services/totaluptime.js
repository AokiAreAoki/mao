// eslint-disable-next-line no-global-assign
require = global.alias(require)

/** @type {import('@/libs/service-manager').Inclusion} */
module.exports = {
	id: "totaluptime",
	name: "Total Uptime Tracker",
	alwaysOn: true,
	init({ sb }){
		const { Events } = require( 'discord.js' )
		const timer = require( '@/libs/timer' )
		const { db } = require( '@/instances/bakadb' )
		const client = require( '@/instances/client' )

		const INTERVAL = 30
		let lastTick = null

		function doTick(){
			if( lastTick ){
				const diff = Date.now() - lastTick
				const newTotalUptime = ( db.totaluptime ?? 0 ) + diff / 60e3
				db.totaluptime = Math.round( newTotalUptime * 10 ) / 10
			}

			lastTick = Date.now()
		}

		function startTimer(){
			doTick()
			timer.create( 'totaluptime', INTERVAL, 0, doTick )
		}

		function stopTimer(){
			doTick()
			timer.remove( 'totaluptime' )
			lastTick = null
		}

		sb.on( client, Events.ShardReady, startTimer )
		sb.on( client, Events.Invalidated, stopTimer )
	}
}