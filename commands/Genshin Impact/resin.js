module.exports = {
	requirements: 'TimeSplitter',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		const maxResin = 160
		const minutesPerResin = 8

		addCmd( 'resin', {
			short: 'calcs time required to regenerate resin from N to M value',
			full: `Usage: \`-resin <from> <to>\`\n\nCalcs time required for resin to regenerate from \`<from>\` to \`<to>\`\n\nExamples:`
			+ '\n`-resin 60` - calcs time required to regenerate 60 resin'
			+ '\n`-resin 15 40` - calcs time required for resin to regenerate from 15 to 40'
			+ '\n`-resin 123 max` - calcs time required for resin to regenerate from 123 to max (160)'
			+ '\n    `max` also has an alias: `full`'
		}, ( msg, args ) => {
			let [from, to] = args
			let oneArg = false

			if( to )
				to = to?.toLowerCase()
			else if( from ){
				[from, to] = [0, from]
				oneArg = true
			}

			if( isNaN( from = parseInt( from ) ) )
				return msg.send( '`-help resin` for help' )

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
				ignoreZeroValues: true,
				absOrder: true,
				formatter: ( value, unit, units ) => `\`${value} ${units}\``
			})

			if( oneArg )
				msg.send( `\`${to}\` resin will be regenerated in ${timeleft} ± \`${minutesPerResin / 2} minutes\`` )
			else
				msg.send( `Resin will regenerate from \`${from}\` to \`${to}\` in ${timeleft} ± \`${minutesPerResin / 2} minutes\`` )
		})
	}
}