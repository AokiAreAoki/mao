module.exports = {
	requirements: 'client httpGet db bakadb',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		// guilds..channels..tags
		let sources = {
			gelbooru: {
				url: 'https://aoki.000webhostapp.com/glbr/search/?token=V4OrT6KatVcyHOLaDIVC6yQTNp3RVFKMa47Obwdvee4dc&q=',
				key: 'file_url',
				domen: 'gelbooru.com',
			},
			yandere: {
				url: 'https://yande.re/post.json?page=1&limit=100&tags=',
				key: 'sample_url',
				domen: 'yande.re',
			},
		}
		let dailies = {
			'314411314724208641': {
				'695758720780599329': { src: 'yandere', tags: 'catgirl -nipples -e' },
				'695758663406583918': { src: 'yandere', tags: 'feet -nipples -e' },
				'695758756469800970': { src: 'yandere', tags: 'pantsu ass -nipples -e' },
			}
		}
		mao.daily_girls = dailies
		
		// Debugger
		function post_anime_girls(){
			db.last_daily_girls = 0
			check()
		}
		mao._pag = post_anime_girls
		
		function log( text ){
			if( text ) console.log( '[DAG] ' + text )
		}
		
		function capitalize( text ){
			return text[0].toUpperCase() + text.substring(1)
		}
		
		async function check(){
			let now = new Date(),
				today = now.getDate().toString() + '/' + ( now.getMonth() + 1 ).toString()
			
			if( db.last_daily_girls === today ) return
			db.last_daily_girls = today
			bakadb.save()
			
			for( let gid in dailies ){
				for( let chid in dailies[gid] ){
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
					
					let tags = dailies[gid][chid].tags
					let message = await channel.send( embed()
						.addField( 'Parsing daily anime girl...', `Tags: ${tags ? `\`${tags}\`` : 'no tags'}` )
						.setFooter( 'Today: ' + today )
					)
					tags = tags || ''
					
					let src = sources[dailies[gid][chid].src]
					
					if( !src ){
						log( `ERROR: Unknown source "${dailies[gid][chid].src}"` )
						return
					}
					
					httpGet( src.url + tags, pics => {
						try {
							pics = JSON.parse( pics )
						} catch( err ){
							message.edit( embed()
								.setDescription( `Tag(s) \`${tags}\` not found :c` )
								.setColor( 0xFF0000 )
							)
							return
						}
						
						if( pics.length == 0 )
							return message.edit( embed()
								.setDescription( `Tag(s) \`${tags}\` not found :c` )
								.setColor( 0xFF0000 )
							)
						
						//let r = Math.floor( Math.random() * pics.length ),
						let r = 0,
							score = 0
						
						pics.forEach( ( pic, k ) => {
							if( Date.now() - ( new Date( pic.created_at ).getTime() ) < 86400e3 && score < pic.score ){
								score = pic.score
								r = k
							}
						})
						
						//if( !/\S/.test( tags ) ) tags = 'no tags';
						
						message.edit( embed()
							.setDescription( `[${capitalize( channel.name.replace( /[-_]+/g, ' ' ) )}](https://yande.re/post/show/${pics[r].id})` )
							.setImage( pics[r][src.key] )
							.setFooter( 'Powered by ' + src.domen )
						)
					}, err => message.edit( cb( err ) ) )
				}
			}
		}
		
		client.on( 'ready2', () => {
			timer.create( 'daily_anime_girls', 300, 0, check )
			check()
		})
	}
}