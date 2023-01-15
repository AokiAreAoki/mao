module.exports = {
	init(){
		const { Events, ActivityType } = require( 'discord.js' )
		const client = global.alias( '@/instances/client' )
		const bakadb = global.alias( '@/instances/bakadb' )
		const timer = global.alias( '@/re/timer' )
		const checkTypes = global.alias( '@/functions/checkTypes' )

		const activityTypes = {
			playing: ActivityType.Playing,
			streaming: ActivityType.Streaming,
			listening: ActivityType.Listening,
			watching: ActivityType.Watching,
			custom: ActivityType.Custom,
			competing: ActivityType.Competing,
		}

		function Activity( options ){
			if( typeof options === 'string' )
				return Activity({ callback: options })

			const activity = {
				type: typeof options.type === 'string'
					? activityTypes[options.type.toLowerCase()]
					: typeof options.type === 'number'
						? options.type
						: activityTypes.playing,
			}

			if( typeof activity.type !== 'number' )
				throw Error( `Unknown activity type: "${options.type}", expected one of: ${Object.keys( activityTypes ).join( ' ' )}` )

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

				const customActivities = bakadb.fallback({
					path: 'customActivities',
					defaultValue: [],
				})

				let ca
				while( ca = customActivities[0] ){
					if( !isNaN( ca.deadline ) && isFinite( ca.deadline ) && ca.deadline > Date.now() )
						return ca

					customActivities.shift()
					bakadb.save()
				}

				return this.activities[this.id]
			}

			static init( client ){
				bakadb
					.fallback({
						path: 'customActivities',
						defaultValue: [],
					})
					.sort( ( a, b ) => a.deadline - b.deadline )

				client.on( Events.ShardReady, () => ActivityManager.reset() )
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
			static setCA({ name, deadline, type, callback }){
				checkTypes( { name }, 'string' )
				checkTypes( { deadline }, 'string' )
				checkTypes( { callback }, 'function' )

				if( activityTypes[type.toLowerCase()] == null )
					throw Error( `\`type\` must be one of: ${Object.keys( activityTypes ).join( ', ' )}` )

				const customActivities = bakadb.fallback({
					path: 'customActivities',
					defaultValue: [],
				})
				const activity = Activity({ name, deadline, type, callback })
				const index = customActivities.findIndex( a => a.name === name )

				if( index === -1 )
					customActivities.push( activity )
				else
					customActivities[index] = activity

				customActivities.sort( ( a, b ) => a.deadline - b.deadline )
			}
		}

		ActivityManager.Activity = Activity
		module.exports = ActivityManager

		client.once( Events.ClientReady, () => ActivityManager.init( client ) )
		require( './default-activities' )
	}
}