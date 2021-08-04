module.exports = {
	requirements: 'client embed Gelbooru Yandere clamp tts',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		const coefficient = .02
		const maxPicsPerCommand = 9
		const maxPicsPerCommandSqrt = Math.sqrt( maxPicsPerCommand + coefficient )
		const picsPerMessage = 5
		const maxPicsPerCommandRaw = maxPicsPerCommand * picsPerMessage
		const maotag = 'amatsuka_mao'
		const safetag = 'rating:safe'
		const usedPics = {}
		const cooldown = {}

		const loadingPhrases = [
			'Processing...',
			'Loading...',
			'Searching...',
			'Looking for lewds',
			'Calling the cops...',
			'OK...',
			'Wait a bit...',
			'読み込み中...',
			'Sending nudes...',
			'Please stand by...',
			'Calm down, weeb...',
			'<insert loading text here>',
			':police_car:',
			'owo',
			'no',
			'pervert',
			'bruh',
			'virgin',
			'umm',
			'oh',
			'wow',
			'rip pp',
			'hot',
			'.-.',
			'...',
		]
		const getRandomLoadingPhrase = () => loadingPhrases[Math.floor( Math.random() * loadingPhrases.length )]

		function cd( user, x ){
			const id = user.id || user
			
			if( typeof id !== 'string' )
				return
			
			if( typeof x === 'number' )
				return cooldown[id] = Math.max( cd( user ), Date.now() ) + ( maxPicsPerCommandSqrt - Math.sqrt( maxPicsPerCommand + coefficient - x ) ) * 6e3
			
			return cooldown[id] ?? 0
		}
		
		async function getNewPics( booruResponse, amount, msg ){
			let { pics } = booruResponse
			
			if( !usedPics[msg.guild.id] )
				usedPics[msg.guild.id] = {}
			
			const used = usedPics[msg.guild.id]
			const unused = []
			
			while( unused.length < amount ){
				unused.push( ...pics.filter( pic => !used[pic.id] || Date.now() - used[pic.id] > 3600e3 ) )

				if( unused.length < amount ){
					pics = ( await booruResponse.parseNextPage() ).pics

					if( pics.length === 0 )
						break
				} else
					break
			}

			const newPics = []
			
			for( let i = 0; i < amount; ++i ){
				const unusedPic = unused.shift()
				
				if( unusedPic ){
					newPics.push( unusedPic )
					used[unusedPic.id] = Date.now()
					continue
				}
				
				const oldestPic = pics.reduce( ( prev, pic ) => used[pic.id] < used[prev.id] ? pic : prev, pics[Math.floor( Math.random() * pics.length )] )
				
				if( oldestPic ){
					newPics.push( oldestPic )
					used[oldestPic.id] = Date.now()
				}
			}

			return newPics
		}

		const sharedCallback = async ( userMsg, args ) => {
			if( !userMsg.member.antispam || userMsg.member.antispam < Date.now() )
				userMsg.member.antispam = Date.now() + 1337
			else
				return userMsg.react( '❌' )
			
			if( cd( userMsg.member ) > Date.now() )
				return userMsg.send( `**Cool down, baka!** \`${Math.floor( cd( userMsg.member, 1 ) - Date.now() ) / 1e3}\` seconds left` )
	
			let booru

			switch( args[-1][0].toLowerCase() ){
				case 'g':
					booru = Gelbooru
					break
					
				case 'y':
					booru = Yandere
					break
			}

			if( !booru ){
				userMsg.send( `Internal error happaned: unknown booru: "${args[-1]}"` )
				console.warn( `unknown booru: "${args[-1]}"` )
				return
			}

			const tags = args.map( t => t.toLowerCase().replace( /\s/g, '_' ) )
			
			if( tags.some( t => t === maotag ) )
				return userMsg.send( client.emojis.cache.get( '721677327649603594' ).toString() )
			
			const force = args.flags.force && userMsg.author.isMaster()
			let sfw = tags.find( v => v === safetag )
			
			if( !sfw && args.flags.safe ){
				tags.push( safetag )
				sfw = true
			}
			
			if( !sfw && !userMsg.channel.nsfw && !force )
				return userMsg.send( 'This isn\'t an NSFW channel!' );
			
			const botMsg = await userMsg.send( getRandomLoadingPhrase() )
		
			booru.q( tags )
				.then( async result => {
					if( result.pics.length === 0 ){
						botMsg.edit({
							content: '',
							embed: embed()
								.setDescription( `Tag(s) \`${result.tags}\` not found :(` )
								.setColor( 0xFF0000 )
						})

						return
					}

					const { raw, x } = args.flags
					let amount = parseInt( raw ?? x )
					amount = isNaN( amount ) ? 1 : clamp( amount, 0, raw ? maxPicsPerCommandRaw : maxPicsPerCommand )

					const newPics = await getNewPics( result, amount, userMsg )
					let posts

					if( raw ){
						const rawPics = []
						
						for( let i = 0; i < amount; i += picsPerMessage ){
							rawPics.push({
								content: newPics.slice( i, i + picsPerMessage )
									.map( p => p.sample )
									.join( '\n' ),
								embed: null,
							})
						}

						posts = rawPics
					} else
						posts = newPics.map( pic => result.embed( pic ) )
					
					if( posts.length === 1 )
						botMsg.edit( posts[0] )
					else {
						posts.forEach( post => userMsg.send( post ) )
						botMsg.delete()
					}

					cd( userMsg.member, amount )
					delete userMsg.member.antispam
				})
				.catch( err => {
					botMsg.edit( { content: cb( err ), embed: null } )
					console.error( err )
				})
		}

		for( const booru of [
			{
				aliases: 'gelbooru glbr',
				url: 'gelbooru.com',
			},
			{
				aliases: 'yandere yndr',
				url: 'yande.re',
			},
		]){
			addCmd({
				aliases: booru.aliases,
				flags: [
					['force', `force post ignoring the only NSFW channel restiction (master only)`],
					['safe', 'alias for `rating:safe` tag'],
					['x', `<amount>`, `$1 of pics to post (max: ${maxPicsPerCommand})`],
					['raw', `<amount>`, `$1 of pics to post (posts raw links to pics without pretty embed, max: ${maxPicsPerCommandRaw})`],
				],
				description: {
					short: 'hot girls',
					full: [
						`Searches and posts pics from \`${booru.url}\``,
						`This is NSFW command and only available in NSFW channels`,
						`* Add \`--safe\` flag or \`rating:safe\` tag to use it in non-NSFW channel`,
						`~~** tho it doesn't guarantee any safety~~`,
					],
					usages: [
						['[tags]', 'searches for pics by $1'],
					],
				},
				callback: sharedCallback,
			})
		}
	}
}
