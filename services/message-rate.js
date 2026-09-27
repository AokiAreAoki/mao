// eslint-disable-next-line no-global-assign
require = global.alias(require)

/** @type {import('@/libs/service-manager').Inclusion} */
const MessageRateService = {
	id: "message-rate",
	name: "Message Rate Tracker",
	alwaysOn: true,
	getRate(){
		return 0
	},
	init({ sb }){
		const { Events } = require( 'discord.js' )
		const client = require( '@/instances/client' )
		const timer = require( '@/libs/timer' )

		const TIME_INTERVAL = 60e3
		const messageTimestamps = []

		function cleanup(){
			const now = Date.now()
			while( messageTimestamps.length !== 0 && messageTimestamps[0] < now )
				messageTimestamps.shift()
		}

		function onMessage( msg ){
			if( msg.member && !msg.author.bot )
				messageTimestamps.push( Date.now() + TIME_INTERVAL )
		}

		MessageRateService.getRate = function getRate(){
			cleanup()
			return messageTimestamps.length
		}

		sb.on( client, Events.MessageCreate, onMessage )

		sb.onEnabled( () => {
			timer.create( 'message-rate-cleanup', TIME_INTERVAL, 0, cleanup )
		})

		sb.onDisabled( () => {
			timer.remove( 'message-rate-cleanup' )
		})
	}
}

module.exports = MessageRateService