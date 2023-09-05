// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )
		const { Gelbooru, Yandere } = require( '@/instances/booru' )
		const cb = require( '@/functions/cb' )
		const clamp = require( '@/functions/clamp' )
		const Embed = require( '@/functions/Embed' )

		const boorus = [
			{
				booru: Gelbooru,
				safeTag: 'rating:general',
				aliases: 'gelbooru glbr',
			},
			{
				booru: Yandere,
				safeTag: 'rating:safe',
				aliases: 'yandere yndr',
			},
		]

		const maxPicsPerCommand = 10
		const maoTag = 'amatsuka_mao'
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

			`https://c.tenor.com/D2UpGO2TCA4AAAAM/itpedia-hot-tubs-hot-tubs.gif`,
			`https://tenor.com/view/haram-heisenberg-gif-20680378`,
			`https://i.gifer.com/GBon.gif`,
			`https://tenor.com/view/frog-kermit-muppets-idiot-stupid-gif-11872194`,
			`https://tenor.com/view/3d-saul-saul-goodman-adamghik-gif-23876766`,
			`https://tenor.com/view/haram-gif-26607190`,
			`https://tenor.com/view/genshin-impact-yae-miko-guuji-yae-gif-25060162`,
			`https://media.discordapp.net/attachments/836214900057440262/937231057491722250/scripting.gif`,
			`https://tenor.com/view/waiting-for-waiting-discord-discord-mod-nsfw-gif-20063899`,
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
				userMsg.send( `Internal error happened: unknown booru: "${args[-1]}"` )
				console.warn( `unknown booru: "${args[-1]}"` )
				return
			}

			const tags = Array.from( args, t => t.toLowerCase().replace( /\s/g, '_' ) )

			if( tags.some( t => t === maoTag ) )
				return userMsg.send( client.emojis.cache.get( '721677327649603594' ).toString() )

			const force = args.flags.force.specified && userMsg.author.isMaster()
			let sfw = tags.find( v => v === this.safeTag )

			if( !sfw && args.flags.safe.specified ){
				tags.push( this.safeTag )
				sfw = true
			}

			if( !sfw && !userMsg.channel.nsfw && !force )
				return userMsg.send( 'This isn\'t an NSFW channel!' );

			const botMsg = userMsg.send( getRandomLoadingPhrase() )
			const s = tags.length === 1 ? '' : 's'

			this.booru.posts( tags )
				.then( async result => {
					let pics = result.pics

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
							.onPageChanged( ( page, pages ) => ({
								content: null,
								embeds: [pics[page]
									.embed()
									.setFooter({
										text: `Page: ${page + 1}/${pages}`
									})
								]
							}))
							.setMessage( await botMsg )
					} else {
						pics = pics.length === 1
							? pics
							: await getNewPics( result, amount, userMsg )

						botMsg.then( m => m.edit({
							content: null,
							embeds: pics.length === 0
								?  [Embed()
									.setDescription( `No new pics found by \`${result.tags}\` tag${s}` )
									.setColor( 0xFF0000 )
								]
								: pics.map( pic => pic.embed() ),
						}))
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
			const command = addCommand({
				aliases: settings.aliases,
				flags: [
					['force', `force post ignoring the only NSFW channel restriction (master only)`],
					['safe', 'alias for `rating:general` tag'],
					['x', `<amount>`, `$1 of pics to post (max: ${maxPicsPerCommand})`],
					['pager', 'pagination'],
				],
				description: {
					short: 'hot girls',
					full: [
						`Searches and posts pics from \`${settings.booru.url}\``,
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
			command.safeTag = settings.safeTag
		}
	}
}
