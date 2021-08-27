module.exports = {
	requirements: 'Embed numsplit maoclr db',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'uptime',
			description: 'Mao\'s uptime',
			callback: msg => {
				let uptime = process.uptime()
				let v = 'seconds'
				
				if( uptime > 60 ){
					uptime = uptime / 60
					
					if( uptime > 60 ){
						uptime = uptime / 60
						v = 'hours'
					} else {
						v = 'minutes'
					}
				}
				
				msg.send( `Uptime: ${Math.floor( uptime )} ${v}` )
			},
		})

		addCmd({
			aliases: 'totaluptime',
			description: 'Mao\'s total uptime',
			callback: msg => {
				let totaluptime = db.totaluptime || 1
				let string_time = `${numsplit( Math.floor( totaluptime ) )}m = ${numsplit( Math.floor( totaluptime / 6 ) / 10 )}h`
				msg.send( Embed().addField( 'Total uptime', string_time ) )
			},
		})
	}
}