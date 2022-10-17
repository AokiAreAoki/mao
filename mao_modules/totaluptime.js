// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const timer = require( '@/re/timer' )
		const { db } = require( '@/instances/bakadb' )

		timer.create( 'totaluptime', 30, 0, () => {
			db.totaluptime = Math.round( ( ( db.totaluptime ?? 0 ) + 0.5 ) * 10 ) / 10
		})
	}
}