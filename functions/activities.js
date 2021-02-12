module.exports = {
	requirements: 'client timer db',
	init: ( requirements, mao ) => {
		requirements.define( global )
	
		const activityTypes = {
			PLAYING: true,
			LISTENING: true,
			WATCHING: true,
			COMPETING: true,
			STREAMING: true,
			CUSTOM_STATUS: false, // for users only
		}
		
		function Activity( type, callbackOrString ){
			if( !callbackOrString )
				[type, callbackOrString] = ['PLAYING', type]
			else
				type = type.toUpperCase()

			if( !activityTypes[type] )
				throw new Error( `Unknown activity type: "${type}"` )

			let activity = { type }

			if( typeof callbackOrString === 'function' )
				activity.invoke = callbackOrString
			else if( typeof callbackOrString === 'string' )
				activity.invoke = () => callbackOrString
			else
				throw new Error( `Wrong typeof second argument (expected function or string, got ${typeof callbackOrString}` )

			return activity
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

			static update(){	
				if( this.next < Date.now() ){
					this.next = Date.now() + this.interval
					this.id = ++this.id % this.activities.length
				}

				let activity = this.getCurrentActivity()
				if( !activity ) return
				let text = String( activity.invoke( activity ) )
				
				if( this.text !== text ){
					this.text = text
					client.user.setActivity( text, { type: activity.type } )
				}
			}
			
			static reset(){
				this.id = -1
				this.text = ''
				this.next = Date.now() + 15e3
				timer.create( 'activities', 3, 0, () => ActivityManager.update() )
			}

			static pushActivity( type, callback ){
				this.activities.push( Activity( type, callback ) )
			}

			static pushCustomActivity( deadline, type, callback ){
				db.customActivities ??= []
				let activity = Activity( type, callback )
				activity.deadline = Number( deadline )
				db.customActivities.push( activity )
			}

			static setCurrentCustomActivity( deadline, type, callback ){
				db.customActivities ??= []
				let activity = Activity( type, callback )
				activity.deadline = Number( deadline )
				db.customActivities[0] = activity
			}
		}
		mao.AM = ActivityManager
		
		client.once( 'ready2', () => {
			ActivityManager.reset()
			client.on( 'ready', ActivityManager.reset )
		})

		// uptime
		ActivityManager.pushActivity( 'PLAYING', () => {
			if( typeof db.totaluptime === 'number' )
				return `for ${ Math.floor( process.uptime() / 3600 ) }/${ Math.floor( db.totaluptime / 60 ) } hours`
			return 'bruh'
		})
		
		// msg rate
		const msgrate = []
		
		client.on( 'message', msg => {
			if( msg.member && !msg.author.bot )
				msgrate.push( Date.now() + 60e3 )
		})

		setInterval( () => {
			while( msgrate.length !== 0 && msgrate[0] < Date.now() )
				msgrate.shift()
		}, 1337 )
		
		ActivityManager.pushActivity( 'PLAYING', () => msgrate.length + ' msgs/min' )
	}
}
