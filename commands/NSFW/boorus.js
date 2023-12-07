// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )
		const { Gelbooru, Yandere } = require( '@/instances/booru' )
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

		const cooldown = new WeakMap()
		const spamRestrictions = new WeakMap()

		function setCoolDown( user, power ){
			const id = user.id || user

			if( typeof id !== 'string' )
				return

			const nextRequest = Math.max( getCoolDown( user ), Date.now() ) + Math.sin( power * Math.PI / maxPicsPerCommand / 2 ) * 5e3
			cooldown.set( id, nextRequest )
			return nextRequest
		}

		function getCoolDown( user ){
			return cooldown.get( user.id || user ) ?? 0
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

		async function sharedCallback({ msg, args, session }){
			if( !spamRestrictions.get( msg.member ) || spamRestrictions.get( msg.member ) < Date.now() )
				spamRestrictions.set( msg.member, Date.now() + 1337 )
			else
				return msg.react( '❌' )

			if( getCoolDown( msg.member ) > Date.now() )
				return session.update( `**Cool down, baka!** \`${Math.floor( getCoolDown( msg.member, 1 ) - Date.now() ) / 1e3}\` seconds left` )

			if( !this.booru ){
				session.update( `Internal error happened: unknown booru: "${args[-1]}"` )
				console.warn( `unknown booru: "${args[-1]}"` )
				return
			}

			const tags = Array.from( args, t => t.toLowerCase().replace( /\s/g, '_' ) )

			if( tags.some( t => t === maoTag ) )
				return session.update( client.emojis.cache.get( '721677327649603594' ).toString() )

			const force = args.flags.force.specified && msg.author.isMaster()
			let sfw = tags.find( v => v === this.safeTag )

			if( !sfw && args.flags.safe.specified ){
				tags.push( this.safeTag )
				sfw = true
			}

			if( !sfw && !msg.channel.nsfw && !force )
				return session.update( 'This isn\'t an NSFW channel!' );

			session.update( getRandomLoadingPhrase() )
			const s = tags.length === 1 ? '' : 's'

			const result = await this.booru.posts( tags )
			let pics = result.pics

			if( pics.length === 0 )
				return session.update({
					embeds: [Embed()
						.setDescription( `Nothing found by \`${result.tags}\` tag${s} :(` )
						.setColor( 0xFF0000 )
					],
				})

			let amount = parseInt( args.flags.x[0] )
			amount = isNaN( amount ) ? 1 : clamp( amount, 0, maxPicsPerCommand )

			if( args.flags.pager.specified ){
				msg.author.createPaginator()
					.setPages( pics.length )
					.onPageChanged( ( page, pages ) => ({
						embeds: [pics[page]
							.embed()
							.setFooter({
								text: `Page: ${page + 1}/${pages}`
							})
						]
					}))
					.setMessage( await session.response.message )
			} else {
				pics = pics.length === 1
					? pics
					: await getNewPics( result, amount, msg )

				session.update({
					embeds: pics.length === 0
						?  [Embed()
							.setDescription( `No new pics found by \`${result.tags}\` tag${s}` )
							.setColor( 0xFF0000 )
						]
						: pics.map( pic => pic.embed() ),
				})
			}

			setCoolDown( msg.member, amount )
			spamRestrictions.delete( msg.member )
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
