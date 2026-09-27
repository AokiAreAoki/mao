const { instance: ActivityManager } = require( '.' )

// eslint-disable-next-line no-global-assign
require = global.alias(require)
const TimeSplitter = require( '@/libs/time-splitter' )
const messageRateService = require( '@/services/message-rate' )

// uptime
ActivityManager.pushActivity( 'PLAYING', () => {
	const duration = new TimeSplitter({ seconds: process.uptime() })
		.toString({
			maxTU: 1,
			ignoreZeros: true,
			separator: ', '
		})

	return `for ${duration}`
})

// msg rate
ActivityManager.pushActivity( 'PLAYING', () => {
	const rate = messageRateService.getRate()
	return `${rate} msg${rate === 1 ? '' : 's'}/min`
})
