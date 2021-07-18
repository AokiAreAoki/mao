module.exports = {
	requirements: 'client',
	init: ( requirements, mao ) => {
		requirements.define( global )
				
		async function sortChannels( parentID, callback ){
			let channels = client.channels.cache.array().filter( c => c.parentID == parentID )
			
			channels.sort( ( a, b ) => {
				a = a.name, b = b.name
				let i = 0
		
				do {
					if( a[i] === b[i] ) continue
					if( b.length < i ) return 1
					return a.charCodeAt(i) - b.charCodeAt(i)
				} while( ++i < a.length )
		
				return -1
			})
		
			for( let i = 0; i < channels.length; ++i )
				if( channels[i].position !== i )
					await channels[i].setPosition(i)
			
			if( typeof callback === 'function' )
				callback( channels.length !== 0 ? channels : null )
		}
		
		addCmd( 'sortchannels', {
			short: 'sorts channels in category',
			full: 'sorts channels in category by alphabet',
			usages: [
				[`<category ID>`, 'sorts channels of $1 by alphabet'],
			],
		}, ( msg, args ) => {
			if( msg.member.hasPermission( discord.Permissions.FLAGS.MANAGE_CHANNELS ) ){
				if( /^\d+$/.test( args[0] ) ){
					let category = client.channels.cache.get( args[0] )
					
					if( category ){
						if( category.type === 'category' )
							msg.send( `Sorting \`#${category.name}\`...` )
						else
							msg.send( `This isn't a category, this is ${category.type} channel` )
					} else
						msg.send( `Category with ID "${args[0]}" not found` )
					
					sortChannels( args[0], channels => {
						if( channels == null )
							msg.send( 'Hmm... Seems like this category is empty' )
						else if( channels.length === 1 )
							msg.send( 'Hmm... Seems like this category has only one channel' )
						else
							msg.send( `Done! ${channels.length} channels have been sorted` )
					})
				} else
					msg.send( 'Please, provide category ID' )
			} else
				msg.send( "You don't have permission" )
		})
	}
}