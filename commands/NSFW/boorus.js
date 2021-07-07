module.exports = {
	requirements: 'client embed Gelbooru Yandere clamp tts',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		const coefficient = .02
		const maxPicsPerCommand = 9
		const maxPicsPerCommandSqrt = Math.sqrt( maxPicsPerCommand + coefficient )
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
		
		function getNewPics( result, amount, msg, callback ){
			const { pics } = result
			
			if( !usedPics[msg.guild.id] )
				usedPics[msg.guild.id] = {}
			
			const used = usedPics[msg.guild.id]
			const unused = pics.filter( pic => !used[pic.id] || Date.now() - used[pic.id] > 3600e3 )
			
			for( let i = 0; i < amount; ++i ){
				const unused_pic = unused.shift()
				
				if( unused_pic ){
					callback({
						content: pic.unsupportedExtenstion ? pic.full : '',
						embed: result.embed( unused_pic ),
					})

					used[unused_pic.id] = Date.now()
					continue
				}
				
				const oldest_used = pics.reduce( ( prev, pic ) => used[pic.id] < used[prev.id] ? pic : prev, pics[Math.floor( Math.random() * pics.length )] )
				
				if( oldest_used ){
					callback({
						content: pic.unsupportedExtenstion ? pic.full : '',
						embed: result.embed( oldest_used ),
					})

					used[oldest_used.id] = Date.now()
				}
			}
		}

		function postPictures( result, amount, user_msg, bot_msg ){
			if( result.pics.length === 0 ){
				bot_msg.edit({
					content: '',
					embed: embed()
						.setDescription( `Tag(s) \`${result.tags}\` not found :(` )
						.setColor( 0xFF0000 )
				})

				return
			}
			
			getNewPics( result, amount, user_msg, post => {
				user_msg[amount === 1 ? 'edit' : 'send']( post )
			})

			if( amount !== 1 )
				bot_msg.delete()

			cd( user_msg.member, amount )
			delete user_msg.member.antispam
		}
		
		const sharedCallback = async ( msg, args ) => {
			if( !msg.member.antispam || msg.member.antispam < Date.now() )
				msg.member.antispam = Date.now() + 1337
			else
				return msg.react( '❌' )
			
			if( cd( msg.member ) > Date.now() )
				return msg.send( `**Cool down, baka!** \`${Math.floor( cd( msg.member, 1 ) - Date.now() ) / 1e3}\` seconds left` )
	
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
				msg.send( `Internal error happaned: unknown booru: "${args[-1]}"` )
				console.warn( `unknown booru: "${args[-1]}"` )
				return
			}

			const tags = args.map( t => t.toLowerCase().replace( /\s/g, '_' ) )
			
			if( tags.find( t => t === maotag ) )
				return msg.send( client.emojis.cache.get( '721677327649603594' ).toString() )
			
			const force = args.flags.force && msg.author.isMaster()
			let sfw = tags.find( v => v === safetag )
			let x = parseInt( args.flags.x )
			x = isNaN(x) ? 1 : clamp( x, 1, maxPicsPerCommand )
			
			if( !sfw && args.flags.safe ){
				tags.push( safetag )
				sfw = true
			}
			
			if( !sfw && !msg.channel.nsfw && !force )
				return msg.send( 'This isn\'t an NSFW channel!' );
			
			const message = await msg.send( getRandomLoadingPhrase() )
		
			booru.q( tags )
				.then( res => postPictures( res, x, msg, message ) )
				.catch( err => {
					message.edit( { content: cb( err ), embed: null } )
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