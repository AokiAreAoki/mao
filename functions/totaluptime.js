module.exports = {
	requirements: 'timer db',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		timer.create( 'totaluptime', 30, 0, () => {
			db.totaluptime = Math.round( ( ( db.totaluptime || 0 ) + 0.5 ) * 10 ) / 10
		})
	}
}