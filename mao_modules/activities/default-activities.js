const ActivityManager  = require( '.' )

// eslint-disable-next-line no-global-assign
require = global.alias(require)
const { Events } = require( 'discord.js' )
const client = require( '@/instances/client' )
const TimeSplitter = require( '@/re/time-splitter' )

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
const messageRate = []

client.on( Events.MessageCreate, msg => {
	if( msg.member && !msg.author.bot )
		messageRate.push( Date.now() + 60e3 )
})

setInterval( () => {
	while( messageRate.length !== 0 && messageRate[0] < Date.now() )
		messageRate.shift()
}, 1337 )

ActivityManager.pushActivity( 'PLAYING', () => `${messageRate.length} msg${messageRate.length === 1 ? '' : 's'}/min` )
