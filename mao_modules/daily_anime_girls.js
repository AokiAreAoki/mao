// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const discord = require( 'discord.js' )
		const client = require( '@/instances/client' )
		const bakadb = require( '@/instances/bakadb' )
		const { Gelbooru, Yandere } = require( '@/instances/booru' )
		const cb = require( '@/functions/cb' )
		const Embed = require( '@/functions/Embed' )
		const timer = require( '@/re/timer' )

		bakadb.db.dag ??= {
			GMT: 3,
			postAt: 21,
		}

		const sources = {
			gelbooru: Gelbooru,
			yandere: Yandere,
		}

		function capitalize( text ){
			return text[0].toUpperCase() + text.substring(1)
		}

		function getDate( date = Date.now() ){
			const GMT = bakadb.db.dag.GMT ?? 0
			const postAt = bakadb.db.dag.postAt ?? 0
			return Math.floor( ( Number( date ) + ( GMT - postAt ) * 3600e3 ) / 86400e3 )
		}

		function getDateStart( date = getDate() ){
			return date * 86400e3
		}

		// eslint-disable-next-line no-unused-vars
		function parseXML( xml ){
			let posts = xml.match( /<post\s+(.+?)\/>/gm )
			let result = []

			posts.forEach( post => {
				let post_data = {}

				post.replace( /([\w_-]+)="(.+?)"/g, ( _, k, v ) => {
					post_data[k] = v
				})

				result.push( post_data )
			})

			return result
		}

		// Main function
		async function postAnimeGirls( channel, printDisabledNotification = true ){
			// "*" passed
			if( channel === '*' ){
				const guilds = bakadb.get( 'dag/data' )

				if( guilds ){
					let guild

					for( let guild_id in guilds )
						if( guild = await client.guilds.fetch( guild_id ) )
							postAnimeGirls( guild, false )

					return true
				}

				return false
			}

			// Guild passed
			if( channel instanceof discord.Guild ){
				const guild = channel
				const channels = bakadb.get( 'dag/data', guild.id )

				if( channels ){
					for( let channel_id in channels )
						postAnimeGirls( channel_id, false )

					return true
				}

				return false
			}

			// Channel passed
			if( typeof channel === 'number' )
				channel = String( channel )

			if( typeof channel === 'string' )
				channel = await client.channels.fetch( channel )

			if( channel instanceof discord.TextChannel ){
				if( !( channel.guild instanceof discord.Guild ) )
					throw new Error( 'The channel have no guild' )
			} else
				throw new Error( 'The channel arg must be an instance of Discord.TextChannel or an ID of a channel' )

			const today = getDate()
			const dailyData = bakadb.get( 'dag/data', channel.guild.id, channel.id )

			if( !dailyData )
				throw new Error( 'This channel have no dailies set up' )

			if( dailyData.disabled ){
				if( printDisabledNotification ){
					const message = await channel.send( `Dailies are disabled in this channel` )

					dailyData.last_posts.push({
						channel_id: message.channel.id,
						message_id: message.id,
						date: today,
					})
					bakadb.save()
				}

				return
			}

			const tags = dailyData.tags ?? ''
			const source = dailyData.src
			const Booru = sources[source]

			if( !Booru )
				throw new Error( `ERROR: Unknown source "${source}"` )

			const message = await channel.send( Embed()
				.addFields({
					name: 'Parsing daily anime girls...',
					value: `${tags ? `Tags: \`${tags}\`` : 'No tags'}`,
				})
				.setFooter({ text: 'Powered by ' + Booru.name })
			)

			if( dailyData.last_posts )
				undoAnimeGirls( channel, today )
			else
				dailyData.last_posts = []

			const postData = {
				channel_id: channel.id,
				message_id: message.id,
				date: today,
			}

			dailyData.last_posts = dailyData.last_posts.filter( p => today - p.date < 7 )
			dailyData.last_posts.push( postData )
			bakadb.save()

			Booru.q( tags )
				.then( async response => {
					const startOfTheDay = getDateStart( today )
					let pic, pics = response.pics.filter( pic => {
						const postedAt = new Date( pic.created_at )
						return startOfTheDay > postedAt && startOfTheDay - postedAt < 86400e3
					})

					if( pics.length !== 0 )
						// Choose a pic with the best score or else the first one
						pic = pics.reduce( ( final_pic, cur_pic ) => final_pic.score < cur_pic.score ? cur_pic : final_pic, pics[0] )
					else {
						pics = response.pics

						if( pics.length === 0 ){
							message.edit( Embed()
								.setDescription( `Tag(s) \`${tags}\` not found :(` )
								.setColor( 0xFF0000 )
							)
							return
						}

						pic = pics[Math.floor( Math.random() * pics.length )]
					}

					const tagsParam = new RegExp( `[&\\?]${Booru.params.tags}=.*?(?:(&|$))`, 'i' ),
						// ^to remove `tags` parameter from url
						title = capitalize( channel.name.replace( /[-_]+/g, ' ' ) ),
						url = pic.post_url.replace( tagsParam, '' ),
						messageData = response.embed( pic )

					messageData.embeds[0].setDescription( `[${title}](${url})` )
					await message.edit( messageData )

					if( dailyData.doCreateThread ){
						const date = new Date()

						message.startThread({
							autoArchiveDuration: 1440, // 1 day
							name: [
								String( date.getDate() ).replace( /^(\d)$/, '0$1' ),
								String( date.getMonth() + 1 ).replace( /^(\d)$/, '0$1' ),
								String( date.getYear() % 100 ).replace( /^(\d)$/, '0$1' ),
							].join( '.' ),
						})
							.then( () => postData.hasThread = true )
							.catch( err => {
								delete postData.hasThread
								console.error( err )
							})
							.then( () => bakadb.save() )
					}
				})
				.catch( err => message.edit({
					content: cb( err.stack ),
					embeds: [],
				}))
		}

		// Undo function
		function undoAnimeGirls( channel, date = getDate() ){
			// "*" passed
			if( channel === '*' ){
				const guilds = bakadb.get( 'dag/data' )

				if( guilds ){
					let guild

					for( let guild_id in guilds )
						if( guild = client.guilds.cache.get( guild_id ) )
							undoAnimeGirls( guild, date )

					return true
				}

				return false
			}

			// Guild passed
			if( channel instanceof discord.Guild ){
				const guild = channel
				const channels = bakadb.get( 'dag/data', guild.id )

				if( channels ){
					for( let channel_id in channels )
						undoAnimeGirls( channel_id, date )

					return true
				}

				return false
			}

			// Channel passed
			if( typeof channel === 'number' )
				channel = String( channel )

			if( typeof channel === 'string' )
				channel = client.channels.cache.get( channel )

			if( channel instanceof discord.TextChannel ){
				if( !( channel.guild instanceof discord.Guild ) )
					throw new Error( 'The channel have no guild' )
			} else
				throw new Error( 'The channel arg must be an instance of Discord.TextChannel or an ID of a channel' )

			const dailyData = bakadb.get( 'dag/data', channel.guild.id, channel.id )

			if( dailyData.last_posts ){
				let posts = dailyData.last_posts.filter( post => post.date === date )
				// postS in case if something bad happen and there will be more than 1 post at the same day

				if( posts.length > 0 ){
					posts.forEach( async post => {
						const msg = await client.channels.cache.get( post.channel_id )?.messages.fetch( post.message_id )

						if( msg?.deletable ){
							await msg.edit( Embed()
								.setDescription( 'Deleted' )
								.setColor( 0xFF0000 )
							)

							msg.delete( 1337 )
							msg.thread?.delete()
						}
					})

					dailyData.last_posts = dailyData.last_posts.filter( post => post.date !== date )
					bakadb.save()
					return true
				}

				return false
			}

			dailyData.last_posts = []
			bakadb.save()
			return false
		}

		// Access to function from main scope
		module.exports.dag = {
			post: postAnimeGirls,
			undo: undoAnimeGirls,
			postAt( timeH ){
				bakadb.db.dag.postAt = timeH
				bakadb.db.dag.last_post = getDate()
				bakadb.save()
			},
			setGMT( gmt ){
				bakadb.db.dag.GMT = gmt
				bakadb.db.dag.last_post = getDate()
				bakadb.save()
			},
		}

		// Poster
		async function check(){
			const today = getDate()

			if( bakadb.get( 'dag/last_post' ) === today )
				return

			bakadb.set( 'dag/last_post', today )
			bakadb.save()

			postAnimeGirls( '*' )
				.catch( console.log )
		}

		client.on( 'ready', () => {
			timer.create( 'daily_anime_girls', 30, 0, check )
			check()
		})
	}
}