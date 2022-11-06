// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const client = require( '@/instances/client' )
		const timer = require( '@/re/timer' )
		const { db } = require( '@/instances/bakadb' )

		const activityTypes = {
			PLAYING: true,
			LISTENING: true,
			WATCHING: true,
			COMPETING: true,
			STREAMING: true,
			CUSTOM_STATUS: false, // for users only
		}

		function Activity( options ){
			if( typeof options === 'string' )
				return Activity({ callback: options })

			const activity = {
				type: options.type ? options.type.toUpperCase() : 'PLAYING',
			}

			if( !activityTypes[activity.type] )
				throw Error( `Unknown activity type: "${activity.type}", expected one of ${Object.keys( activityTypes ).join( ' ' )}` )

			if( typeof options.name === 'string' )
				activity.name = options.name

			if( options.deadline )
				activity.deadline = Number( options.deadline )

			if( options.callback instanceof Function ){
				activity.static = false
				activity.callback = options.callback
				return activity
			}

			if( typeof options.callback === 'number' )
				options.callback = String( options.callback )

			if( typeof options.callback === 'string' ){
				activity.static = true
				activity.string = options.callback
				return activity
			}

			throw Error( `Wrong type of options.callback (expected function or string, got ${typeof options.callback}` )
		}

		class ActivityManager {
			static id = -1
			static next = 0
			static text = '<insert text here>'
			static interval = 300e3
			static activities = []
			static wakeupActivity = Activity( 'wakes up~' )

			static getCurrentActivity(){
				if( this.id === -1 )
					return this.wakeupActivity

				let customActivity

				while( customActivity = db.customActivities?.[0] ){
					if( !isNaN( customActivity.deadline ) && isFinite( customActivity.deadline ) && customActivity.deadline > Date.now() )
						return customActivity

					db.customActivities.shift()
				}

				return this.activities[this.id]
			}

			static init( client ){
				db.customActivities ??= []
				db.customActivities.sort( ( a, b ) => a.deadline - b.deadline )

				client.on( 'ready', () => ActivityManager.reset() )
				this.reset()
			}

			static update(){
				if( this.next < Date.now() ){
					this.next = Date.now() + this.interval
					this.id = ++this.id % this.activities.length
				}

				const activity = this.getCurrentActivity()
				if( !activity ) return

				let text = String( activity.static
					? activity.string
					: activity.callback( activity )
				)

				if( this.text !== text ){
					this.text = text
					client.user.setActivity( text, { type: activity.type } )
				}
			}

			static reset(){
				this.id = -1
				this.text = ''
				this.next = Date.now() + 15e3
				timer.create( 'activities', 4, 0, () => ActivityManager.update() )
			}

			static pushActivity( type, callback ){
				this.activities.push( Activity({ type, callback }) )
			}

			// set custom activity
			static setCA( name, deadline, type, callback ){
				db.customActivities ??= []

				const activity = Activity({ name, deadline, type, callback })
				const index = db.customActivities.findIndex( a => a.name === name )

				if( index === -1 )
					db.customActivities.push( activity )
				else
					db.customActivities[index] = activity

				db.customActivities.sort( ( a, b ) => a.deadline - b.deadline )
			}
		}
		ActivityManager.Activity = Activity
		module.exports.ActivityManager = ActivityManager

		client.once( 'ready', () => ActivityManager.init( client ) )

		// uptime
		ActivityManager.pushActivity( 'PLAYING', () => typeof db.totaluptime === 'number'
			? `for ${ Math.floor( process.uptime() / 3600 ) }/${ Math.floor( db.totaluptime / 60 ) } hours`
			: 'bruh'
		)

		// msg rate
		const msgrate = []

		client.on( 'messageCreate', msg => {
			if( msg.member && !msg.author.bot )
				msgrate.push( Date.now() + 60e3 )
		})

		setInterval( () => {
			while( msgrate.length !== 0 && msgrate[0] < Date.now() )
				msgrate.shift()
		}, 1337 )

		ActivityManager.pushActivity( 'PLAYING', () => `${msgrate.length} msg${msgrate.length === 1 ? '' : 's'}/min` )
	}
}