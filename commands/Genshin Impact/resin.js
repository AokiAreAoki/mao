module.exports = {
	requirements: 'TimeSplitter',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		const maxResin = 160
		const minutesPerResin = 8

		addCmd({
			aliases: 'resin',
			description: {
				single: 'calcs time required for resin to regenerate',
				usages: [
					['<amount>', 'calcs time required to regenerate $1 of resin'],
					['<from>', '<to>', 'calcs time required for resin to regenerate from $1 to $2'],
				],
				examples: [
					['60', 'calcs time required to regenerate 60 resin'],
					['max', 'time required for resin to fully replenish'],
					['full', 'the same as `max`'],
					['15', '40', 'calcs time required for resin to regenerate from 15 to 40'],
					['123', 'max/full', 'calcs time required for resin to regenerate from 123 to max (160)'],
				],
			},
			callback: ( msg, args ) => {
				let [from, to] = args
				let oneArg = false

				if( to )
					to = to?.toLowerCase()
				else if( from ){
					[from, to] = [0, from]
					oneArg = true
				}

				if( isNaN( from = parseInt( from ) ) )
					return msg.send( 'Usage: `-help resin`' )

				if( to === 'max' || to === 'full' )
					to = maxResin
				else if( isNaN( to = parseInt( to ) ) )
					return msg.send( 'Provide a valid number' )
				
				if( from < 0 )
					return msg.send( "start value can't be lower than zero" )
					
				if( from > to )
					return msg.send( "How is your start value bigger than end value?" )

				if( from === to )
					return msg.send( '<:suspicious:597568055199137802>' )

				let ts = new TimeSplitter({
					minutes: ( to - from ) * minutesPerResin - minutesPerResin / 2
				})

				let timeleft = ts.toString({
					separator: ', ',
					ignoreZeros: true,
					formatter: ( v, u ) => `\`${v} ${u}\``,
				})

				if( oneArg )
					msg.send( `\`${to}\` resin will be regenerated in ${timeleft} ± \`${minutesPerResin / 2} minutes\`` )
				else
					msg.send( `Resin will regenerate from \`${from}\` to \`${to}\` in ${timeleft} ± \`${minutesPerResin / 2} minutes\`` )
			}
		})
	}
}
