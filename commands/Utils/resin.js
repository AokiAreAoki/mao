// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const TimeSplitter = require( '@/re/time-splitter' )

		const maxResin = 160
		const minutesPerResin = 8

		addCommand({
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
			callback({ args, session }){
				let [from, to] = args
				let oneArg = false

				if( to )
					to = to?.toLowerCase()
				else if( from ){
					[from, to] = [0, from]
					oneArg = true
				}

				if( isNaN( from = parseInt( from ) ) )
					return session.update( 'Usage: `-help resin`' )

				if( to === 'max' || to === 'full' )
					to = maxResin
				else if( isNaN( to = parseInt( to ) ) )
					return session.update( 'Provide a valid number' )

				if( from < 0 )
					return session.update( "start value can't be lower than zero" )

				if( from > to )
					return session.update( "How is your start value bigger than end value?" )

				if( from === to )
					return session.update( '<:suspicious:597568055199137802>' )

				let ts = new TimeSplitter({
					minutes: ( to - from ) * minutesPerResin - minutesPerResin / 2
				})

				let timeleft = ts.toString({
					separator: ', ',
					ignoreZeros: true,
					formatter: ( v, _, u ) => `\`${v} ${u}\``,
				})

				if( oneArg )
					session.update( `\`${to}\` resin will be regenerated in ${timeleft} ± \`${minutesPerResin / 2} minutes\`` )
				else
					session.update( `Resin will regenerate from \`${from}\` to \`${to}\` in ${timeleft} ± \`${minutesPerResin / 2} minutes\`` )
			}
		})
	}
}
