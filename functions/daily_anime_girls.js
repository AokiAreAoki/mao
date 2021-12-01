module.exports = {
	requirements: 'client httpGet db bakadb Gelbooru Yandere discord Embed',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		db.dag ??= {
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
			const GMT = db.dag.GMT ?? 0
			const postAt = db.dag.postAt ?? 0
			return Math.floor( ( Number( date ) + ( GMT - postAt ) * 3600e3 ) / 86400e3 )
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

		class ThreadCreationCanceler {
			canceled = false

			delete(){
				this.canceled = true
			}
		}

		// Main function
		async function postAnimeGirls( channel ){
			// "*" passed
			if( channel === '*' ){
				const guilds = bakadb.get( 'dag/data' )

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
				const channels = bakadb.get( 'dag/data', guild.id )

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
			
			const dailyData = bakadb.get( 'dag/data', channel.guild.id, channel.id )

			if( !dailyData )
				throw new Error( 'This channel have no dailies setup' )

			const {
				src: source,
				doCreateThread
			} = dailyData
			
			const tags = dailyData.tags ?? ''
			const Booru = sources[source]

			if( !Booru )
				throw new Error( `ERROR: Unknown source "${source}"` )
			
			const message = await channel.send( Embed()
				.addField( 'Parsing daily anime girls...', `${tags ? `Tags: \`${tags}\`` : 'No tags'}` )
				.setFooter( 'Powered by ' + Booru.name )
			)

			const today = getDate()
			
			if( channel.last_posts )
				undoAnimeGirls( channel, today )
			else
				channel.last_posts = []

			const post = {
				channel_id: channel.id,
				message_id: message.id,
				date: today,
			}
			channel.last_posts.push( post )

			if( doCreateThread )
				post.thread = new ThreadCreationCanceler()

			Booru.q( tags ).then( async response => {
				let pic, pics = response.pics.filter( pic => Date.now() - new Date( pic.created_at ) < 86400e3 )

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

				const tagsParam = new RegExp( `[&\\?]${Booru.qs.tags}=.*?(?:(&|$))`, 'i' ),
					// ^to remove `tags` parameter from url
					title = capitalize( channel.name.replace( /[-_]+/g, ' ' ) ),
					url = pic.post_url.replace( tagsParam, '' ),
					messageData = response.embed( pic )
					
				messageData.embeds[0].setDescription( `[${title}](${url})` )
				await message.edit( messageData )
				
				if( doCreateThread ){
					const date = new Date()

					message.startThread({
						autoArchiveDuration: 1440, // 1 day
						name: [
							String( date.getDate() ).replace( /^(\d)$/, '0$1' ),
							String( date.getMonth() + 1 ).replace( /^(\d)$/, '0$1' ),
							String( date.getYear() % 100 ).replace( /^(\d)$/, '0$1' ),
						].join( '.' ),
					})
						.then( thread => {
							if( post.thread?.canceled )
								thread.delete()
							else
								post.thread = thread
						})
						.catch( console.error )
				}
			}).catch( err => {
				message.edit( { content: cb( err ), embeds: [] } )
			})
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
			
			if( channel.last_posts ){
				let posts = channel.last_posts.filter( post => post.date === date )
				// postS in case if smth bad happen and there will be more than 1 post at the same day

				if( posts.length > 0 ){
					posts.forEach( async post => {
						const msg = await client.channels.cache.get( post.channel_id )?.messages.fetch( post.message_id )

						if( msg?.deletable ){
							await msg.edit( Embed()
								.setDescription( 'Deleted' )
								.setColor( 0xFF0000 )
							)

							msg.delete( 1337 )
							post.thread?.delete()
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
			postAt( timeH ){
				db.dag.postAt = timeH
				db.dag.last_post = getDate()
				bakadb.save()
			},
			setGMT( gmt ){
				db.dag.GMT = gmt
				db.dag.last_post = getDate()
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
		
		client.on( 'ready2', () => {
			timer.create( 'daily_anime_girls', 30, 0, check )
			check()
		})
	}
}
