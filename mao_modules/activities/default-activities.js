const { ActivityManager } = require( '.' )

// eslint-disable-next-line no-global-assign
require = global.alias
const { Events } = require( 'discord.js' )
const client = require( '@/instances/client' )
const TimeSplitter = require( '@/re/time-splitter' )

// uptime
ActivityManager.pushActivity( 'PLAYING', () => {
	return `for ` + new TimeSplitter({ seconds: process.uptime() })
		.toString({
			maxTU: 1,
			ignoreZeros: true,
			separator: ', '
		})
})

// msg rate
const msgrate = []

client.on( Events.MessageCreate, msg => {
	if( msg.member && !msg.author.bot )
		msgrate.push( Date.now() + 60e3 )
})

setInterval( () => {
	while( msgrate.length !== 0 && msgrate[0] < Date.now() )
		msgrate.shift()
}, 1337 )

ActivityManager.pushActivity( 'PLAYING', () => `${msgrate.length} msg${msgrate.length === 1 ? '' : 's'}/min` )
