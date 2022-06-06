module.exports = {
	requirements: 'client Embed Gelbooru Yandere clamp tts',
	init: ( requirements, mao ) => {
		requirements.define( global )

		const boorus = [
			{
				booru: Gelbooru,
				url: 'gelbooru.com',
				aliases: 'gelbooru glbr',
			},
			{
				booru: Yandere,
				url: 'yande.re',
				aliases: 'yandere yndr',
			},
		]

		const maxPicsPerCommand = 10
		const maotag = 'amatsuka_mao'
		const safetag = 'rating:general'
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
				return cooldown[id] = Math.max( cd( user ), Date.now() ) + Math.sin( x * Math.PI / maxPicsPerCommand / 2 ) * 5e3

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

		async function sharedCallback( userMsg, args ){
			if( !userMsg.member.antispam || userMsg.member.antispam < Date.now() )
				userMsg.member.antispam = Date.now() + 1337
			else
				return userMsg.react( '❌' )

			if( cd( userMsg.member ) > Date.now() )
				return userMsg.send( `**Cool down, baka!** \`${Math.floor( cd( userMsg.member, 1 ) - Date.now() ) / 1e3}\` seconds left` )

			if( !this.booru ){
				userMsg.send( `Internal error happaned: unknown booru: "${args[-1]}"` )
				console.warn( `unknown booru: "${args[-1]}"` )
				return
			}

			const tags = args.map( t => t.toLowerCase().replace( /\s/g, '_' ) )

			if( tags.some( t => t === maotag ) )
				return userMsg.send( client.emojis.cache.get( '721677327649603594' ).toString() )

			const force = args.flags.force.specified && userMsg.author.isMaster()
			let sfw = tags.find( v => v === safetag )

			if( !sfw && args.flags.safe.specified ){
				tags.push( safetag )
				sfw = true
			}

			if( !sfw && !userMsg.channel.nsfw && !force )
				return userMsg.send( 'This isn\'t an NSFW channel!' );

			const botMsg = userMsg.send( getRandomLoadingPhrase() )
			const s = tags.length === 1 ? '' : 's'

			this.booru.q( tags )
				.then( async result => {
					const pics = result.pics

					if( pics.length === 0 )
						return botMsg.then( m => m.edit({
							content: null,
							embeds: [Embed()
								.setDescription( `Nothing found by \`${result.tags}\` tag${s} :(` )
								.setColor( 0xFF0000 )
							],
						}))

					let amount = parseInt( args.flags.x[0] )
					amount = isNaN( amount ) ? 1 : clamp( amount, 0, maxPicsPerCommand )

					if( args.flags.pager.specified ){
						userMsg.author.createPaginator()
							.setPages( pics.length )
							.onPageChanged( ( page, pages ) => result.embed( pics[page], embed => {
								embed.setFooter( `(${page + 1}/${pages}) ` + ( embed.footer?.text || '' ) )
							}))
							.setMessage( await botMsg )
					} else {
						const newPics = await getNewPics( result, amount, userMsg )

						botMsg.then( m => m.edit( newPics.length === 0
							? {
								content: null,
								embeds: [Embed()
									.setDescription( `No new pics found by \`${result.tags}\` tag${s}` )
									.setColor( 0xFF0000 )
								],
							}
							: result.embed( newPics )
						))
					}

					cd( userMsg.member, amount )
					delete userMsg.member.antispam
				})
				.catch( err => {
					botMsg.then( m => m.edit( { content: cb( err ), embeds: [] } ) )
					console.error( err )
				})
		}

		for( const settings of boorus ){
			const command = addCmd({
				aliases: settings.aliases,
				flags: [
					['force', `force post ignoring the only NSFW channel restiction (master only)`],
					['safe', 'alias for `rating:general` tag'],
					['x', `<amount>`, `$1 of pics to post (max: ${maxPicsPerCommand})`],
					['pager', 'pagination'],
				],
				description: {
					short: 'hot girls',
					full: [
						`Searches and posts pics from \`${settings.url}\``,
						`This is NSFW command and only available in NSFW channels`,
						`* Add \`--safe\` flag or \`rating:general\` tag to use it in non-NSFW channel`,
						`~~** tho i do not guarantee any safety~~`,
					],
					usages: [
						['[tags]', 'searches for pics by $1'],
					],
				},
				callback: sharedCallback,
			})

			command.booru = settings.booru
		}
	}
}
