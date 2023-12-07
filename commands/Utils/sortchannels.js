// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const discord = require( 'discord.js' )
		const client = require( '@/instances/client' )

		async function sortChannels( category ){
			if( !( category instanceof discord.CategoryChannel ) )
				throw Error( `category must be an instance of CategoryChannel` )

			const channels = Array.from( category.children.cache.values() )

			channels.sort( ( a, b ) => {
				a = a.name
				b = b.name
				let i = 0

				do {
					if( a[i] === b[i] ) continue
					if( b.length < i ) return 1
					return a.charCodeAt(i) - b.charCodeAt(i)
				} while( ++i < a.length )

				return -1
			})

			channels.nothingChanged = true

			for( let i = 0; i < channels.length; ++i )
				if( channels[i].position !== i ){
					await channels[i].setPosition(i)
					channels.nothingChanged = false
				}

			return channels.length !== 0 ? channels : null
		}

		addCommand({
			aliases: 'sortchannels',
			description: {
				single: 'sorts channels in category by alphabet',
				usages: [
					[`<category ID>`, 'sorts channels of $1 by alphabet'],
				],
			},
			async callback({ msg, args, session }){
				if( !msg.member.permissions.has( discord.PermissionsBitField.Flags.ManageChannels ) )
					return session.update( `You don't have permission` )

				if( !/^\d+$/.test( args[0] ) )
					return session.update( `Please, provide category ID` )

				const category = client.channels.resolve( await client.channels.fetch( args[0] ) )

				if( !category )
					return session.update( `Category with ID \`${args[0]}\` not found` )

				if( category.type !== discord.ChannelType.GuildCategory )
					return session.update( `The ID you provided belongs to a non-category type channel` )

				const messagePromise = session.update( `Sorting \`#${category.name}\`...` )
				await category.guild.channels.fetch( null, { force: true } )

				const [channels, message] = await Promise.all([
					sortChannels( category ),
					messagePromise,
				])

				if( channels == null )
					message.edit( `Hmm... Seems like this category is empty` )
				else if( channels.length === 1 )
					message.edit( `Hmm... Seems like this category has only one channel` )
				else if( channels.nothingChanged )
					message.edit( `All channels are sorted in the right order` )
				else
					message.edit( `Done! ${channels.length} channels have been sorted` )
			},
		})
	}
}