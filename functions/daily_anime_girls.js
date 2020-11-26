module.exports = {
	requirements: 'client httpGet db bakadb Gelbooru Yandere',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		// guilds::channels::tags
		let sources = {
			/*
			gelbooru: {
				//url: 'https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=',
				url: 'https://aoki.000webhostapp.com/glbr/?page=dapi&s=post&q=index&json=1&_token=V4OrT6KatVcyHOLaDIVC6yQTNp3RVFKMa47Obwdvee4dc&tags=',
				postURL: id => 'https://gelbooru.com/index.php?page=post&s=view&id=' + id,
				key: 'file_url',
				domen: 'gelbooru.com',
				xml: false,
			},
			yandere: {
				//url: 'https://yande.re/post.json?page=1&limit=100&tags=',
				url: 'https://aoki.000webhostapp.com/yndr/?_token=V4OrT6KatVcyHOLaDIVC6yQTNp3RVFKMa47Obwdvee4dc&tags=',
				postURL: id => 'https://yande.re/post/show/' + id,
				key: 'sample_url',
				domen: 'yande.re',
				xml: false,
			},
			*/
			gelbooru: Gelbooru,
			yandere: Yandere,
		}
		
		// Debugger
		function post_anime_girls(){
			db.last_daily_girls = 0
			check()
		}
		
		let last_posts = []
		async function undo_last_posts(){
			if( last_posts.length === 0 )
				return false
			
			await last_posts.pop().forEach( async post => {
				let chnl = client.channels.cache.get( post.channel_id )
				let msg = await chnl.messages.fetch( post.message_id )
				msg.edit( embed()
					.setDescription( 'Deleted' )
					.setColor( 0xFF0000 )
				).then( () => msg.delete( 3752 ) )
			})
			
			return true
		}
		
		mao._pag = post_anime_girls
		mao._pag_undo = undo_last_posts
		
		function log( text ){
			if( text ) console.log( '[DAG] ' + text )
		}
		
		function capitalize( text ){
			return text[0].toUpperCase() + text.substring(1)
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
		
		async function check(){
			let now = new Date(),
				today = now.getDate().toString() + '/' + ( now.getMonth() + 1 ).toString()
			
			if( db.last_daily_girls === today ) return
			db.last_daily_girls = today
			bakadb.save()
			
			const pagid = last_posts.length
			last_posts.push([])

			for( let gid in db.daily_girls ){
				for( let chid in db.daily_girls[gid] ){
					let guild = client.guilds.cache.get( gid )
					
					if( !guild ){
						log( `ERROR: Guild not found (ID: "${gid}")` )
						break
					}
					
					let channel = guild.channels.cache.get( chid )
					
					if( !channel ){
						log( `ERROR: Channel not found (ID: "${gid}/${chid}")` )
						continue
					}
					
					let tags = db.daily_girls[gid][chid].tags
					let message = await channel.send( embed()
						.addField( 'Parsing daily anime girl...', `Tags: ${tags ? `\`${tags}\`` : 'no tags'}` )
						.setFooter( 'Today: ' + today )
					)
					tags = tags || ''
					
					let Booru = sources[db.daily_girls[gid][chid].src]
					
					if( !Booru ){
						log( `ERROR: Unknown source "${db.daily_girls[gid][chid].src}"` )
						return
					}
					
					Booru.q( tags )
						.then( results => {
							let pics = results.pics

							if( pics.length == 0 )
								return message.edit( embed()
									.setDescription( `Tag(s) \`${tags}\` not found :c` )
									.setColor( 0xFF0000 )
								)
							
							let score = 0, r = 0
							
							pics.forEach( ( pic, k ) => {
								if( Date.now() - ( new Date( pic.created_at ).getTime() ) < 86400e3 && score < pic.score ){
									score = pic.score
									r = k
								}
							})
							
							let tagsParam = new RegExp( `[&\\?]${Booru.qs.tags}=.*?(?:(&|$))`, 'i' ) /// ?tags= param remover

							message.edit( embed()
								.setDescription( `[${capitalize( channel.name.replace( /[-_]+/g, ' ' ) )}](${pics[r].post_url.replace( tagsParam, '' )})` )
								.setImage( pics[r].sample )
								.setFooter( 'Powered by ' + Booru.name )
							).then( m => last_posts[pagid].push({
								channel_id: m.channel.id,
								message_id: m.id,
							}))
						})
						.catch( err => {
							message.edit( cb( err ) ).then( m => last_posts[pagid].push({
								channel_id: m.channel.id,
								message_id: m.id,
							}))
						})
				}
			}
		}
		
		client.on( 'ready2', () => {
			timer.create( 'daily_anime_girls', 30, 0, check )
			check()
		})
	}
}