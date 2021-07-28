module.exports = {
	requirements: 'client httpGet db bakadb Gelbooru Yandere discord',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		const sources = {
			gelbooru: Gelbooru,
			yandere: Yandere,
		}
		
		function capitalize( text ){
			return text[0].toUpperCase() + text.substring(1)
		}
		
		function getDate( date = Date.now() ){
			const GMT = db.GMT ?? 0
			return Math.floor( ( Number( date ) + GMT * 3600e3 ) / 86400e3 )
		}

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
		async function postAnimeGirls( channel ){
			// "*" passed
			if( channel === '*' ){
				const guilds = bakadb.get( 'daily_girls' )

				if( guilds ){
					let guild

					for( let guild_id in guilds )
						if( guild = await client.guilds.fetch( guild_id ) )
							postAnimeGirls( guild )

					return true
				}

				return false
			}

			// Guild passed
			if( channel instanceof discord.Guild ){
				const guild = channel
				const channels = bakadb.get( 'daily_girls', guild.id )

				if( channels ){
					for( let channel_id in channels )
						postAnimeGirls( channel_id )

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
			
			let dailies = bakadb.get( 'daily_girls', channel.guild.id, channel.id )

			if( !dailies )
				throw new Error( 'This channel have no dailies setup' )

			let { src, tags } = dailies
			tags = tags ?? ''
			const Booru = sources[src]
			const today = getDate()
			
			if( !Booru )
				throw new Error( `ERROR: Unknown source "${src}"` )
			
			let message = await channel.send( embed()
				.addField( 'Parsing daily anime girls...', `Tags: ${tags ? `\`${tags}\`` : 'no tags'}` )
				.setFooter( 'Powered by ' + Booru.name )
			)

			if( channel.last_posts )
				undoAnimeGirls( channel, today )
			else
				channel.last_posts = []

			channel.last_posts.push({
				channel_id: channel.id,
				message_id: message.id,
				date: today,
			})

			Booru.q( tags ).then( response => {
				let pic
				let pics = response.pics.filter( pic => Date.now() - new Date( pic.created_at ).getTime() < 86400e3 )

				if( pics.length !== 0 )
					// Choose a pic with the best score or else the first one
					pic = pics.reduce( ( final_pic, cur_pic ) => final_pic.score < cur_pic.score ? cur_pic : final_pic, pics[0] )
				else {
					pics = response.pics

					if( pics.length === 0 ){
						message.edit( embed()
							.setDescription( `Tag(s) \`${tags}\` not found :(` )
							.setColor( 0xFF0000 )
						)
						return
					}

					pic = pics[Math.floor( Math.random() * pics.length )]
				}

				let tagsParam = new RegExp( `[&\\?]${Booru.qs.tags}=.*?(?:(&|$))`, 'i' ), // ?tags= param remover
					title = capitalize( channel.name.replace( /[-_]+/g, ' ' ) ),
					url = pic.post_url.replace( tagsParam, '' )

				const content = response.embed( pic )
				content.embed.setDescription( `[${title}](${url})` )
				message.edit( content )
			}).catch( err => {
				message.edit( { content: cb( err ), embed: null } )
			})
		}

		// Undo function
		function undoAnimeGirls( channel, date = getDate() ){
			// "*" passed
			if( channel === '*' ){
				const guilds = bakadb.get( 'daily_girls' )

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
				const channels = bakadb.get( 'daily_girls', guild.id )

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
			
			if( channel.last_posts ){
				let posts = channel.last_posts.filter( post => post.date === date )
				// postS in case if smth bad happen and there will be more than 1 post at the same day

				if( posts.length > 0 ){
					posts.forEach( async post => {
						let msg = await client.channels.cache.get( post.channel_id )?.messages.fetch( post.message_id )

						if( msg?.deletable ){
							await msg.edit( embed()
								.setDescription( 'Deleted' )
								.setColor( 0xFF0000 )
							)
							msg.delete( 1337 )
						}
					})

					channel.last_posts = channel.last_posts.filter( post => post.date !== date )
					return true
				}

				return false
			}

			channel.last_posts = []
			return false
		}

		// Access to function from main scope
		mao.dag = {
			standsfor: 'daily anime girls',
			post: postAnimeGirls,
			undo: undoAnimeGirls,
		}
		
		// Poster
		async function check(){
			const today = getDate()
			
			if( db.last_daily_girls === today )
				return

			db.last_daily_girls = today
			bakadb.save()
			
			postAnimeGirls( '*' )
				.catch( console.log )
		}
		
		client.on( 'ready2', () => {
			timer.create( 'daily_anime_girls', 30, 0, check )
			check()
		})
	}
}
