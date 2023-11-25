// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const client = require( '@/instances/client' )
		const Embed = require( '@/functions/Embed' )
		const bakadb = require( '@/instances/bakadb' )
		const { db } = bakadb
		const MM = require( '@/instances/message-manager' )
		const TimeSplitter = require( '@/re/time-splitter' )

		const max_tms = 5
		const max_lifetime = 3 * 86400e3

		setInterval( async () => {
			if( !db.temp_messages )
				db.temp_messages = {}

			let now = Date.now()

			for( let messageId in db.temp_messages ){
				let data = db.temp_messages[messageId]

				if( data.timestamp > now )
					continue

				let channel = client.channels.cache.get( data.channel )

				if( !channel )
					continue

				channel.messages.fetch( messageId )
					.then( m => m.delete() )
					.catch( () => {} )
					.then( () => delete db.temp_messages[messageId] )
			}
		}, 5e3 )

		MM.pushHandler( 'temp_messages', false, msg => {
			if( msg.author.id == client.user.id || msg.author.bot )
				return

			const match = msg.content.match( /[\s\n]\/temp\s*((\d+)d)?\s*((\d+)h)?\s*((\d+)m)?\s*((\d+)s)?$/i )

			if( !match )
				return

			let tms = 0
			for( const k in db.temp_messages )
				if( db.temp_messages[k].userId == msg.author.id )
					if( ++tms >= max_tms )
						return msg.send( "You've reached the limit of temporary messages" )

			const lifetime = new TimeSplitter({
				days: match[2] ? parseInt( match[2] ) : 0,
				hours: match[4] ? parseInt( match[4] ) : 0,
				minutes: match[6] ? parseInt( match[6] ) : 0,
				seconds: match[8] ? parseInt( match[8] ) : 0,
			})

			if( lifetime.timestamp === 0 )
				return
			else if( lifetime.timestamp > max_lifetime )
				lifetime.fromMS( max_lifetime )

			db.temp_messages[msg.id] = {
				userId: msg.author.id,
				channel: msg.channel.id,
				timestamp: Date.now() + lifetime.timestamp,
			}
			bakadb.save()

			return msg.send( Embed()
				.setAuthor( '@' + msg.author.tag, msg.author.avatarURL() )
				.setDescription( 'Your message will be deleted in ' + lifetime.toString({
					separator: ', ',
					and: true,
					ignoreZeros: true,
				}))
			).then( m => m.delete( 4e3 ) )
		})
	}
}
