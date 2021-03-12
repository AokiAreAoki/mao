module.exports = {
	requirements: 'client embed Gelbooru Yandere',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		let loadingPhrases = [
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
		
		let getRandomLoadingPhrase = () => loadingPhrases[ Math.floor( Math.random() * loadingPhrases.length ) ]
		let maotag = 'amatsuka_mao'

		let usedPics = {},
			cooldown = {}
		
		function cd( user, x ){
			let id = user.id || user
			
			if( typeof id !== 'string' )
				return
			
			if( typeof x === 'number' )
				return cooldown[id] = Math.max( cd( user ), Date.now() ) + ( 3.1 - Math.sqrt( 10 - x ) ) * 6e3
			
			return cooldown[id] || 0
		}
		
		function getNewPics( tags, pics, amount, msg, callback ){
			if( !usedPics[msg.guild.id] )
				usedPics[msg.guild.id] = {}
			
			let used = usedPics[msg.guild.id],
				unused = pics.filter( pic => !used[pic.id] || Date.now() - used[pic.id] < 3600e3 )
			
			for( let i = 0, r; i < amount; ++i ){
				r = Math.floor( Math.random() * unused.length )
				
				if( unused[r] ){
					callback( unused[r] )
					used[unused[r].id] = Date.now()
					unused.splice( r, 1 )
					continue
				}
				
				r = Math.floor( Math.random() * pics.length )
				
				if( pics[r] ){
					callback( pics[r] )
					used[pics[r].id] = Date.now()
					pics.splice( r, 1 )
				}
			}
		}

		function postPictures( result, x, user_msg, bot_msg ){
			if( result.pics.length === 0 ){
				bot_msg.edit({
					content: '',
					embed: embed()
						.setDescription( `Tag(s) \`${result.tags}\` not found :(` )
						.setColor( 0xFF0000 )
				})
				return
			}
			
			let tags = /\S/.test( result.tags ) ? result.tags : 'no tags'
			
			getNewPics( tags, result.pics, x, user_msg, pic => {
				let post = embed()
					.setFooter( 'Powered by ' + ( result.booru.name ?? 'unknown website' ) )
				
				if( pic.unsupportedExtention )
					post.setDescription( `[${tags}](${pic.post_url})\n\`${pic.unsupportedExtention}\` extention is not supported by Discord AFAIK. So open the [link](${pic.post_url}) to post manually to view it's *content*`)
				else {
					post.setDescription( `[${tags}](${pic.post_url})` )
					post.setImage( pic.sample )
				}
				
				if( x !== 1 )
					user_msg.send( post )
				else
					bot_msg.edit( { embed: post, content: '' } )
			})

			if( x !== 1 )
				bot_msg.delete()

			if( !user_msg.author.isMaster() ) ++x
			cd( user_msg.member, x )
			delete user_msg.member.antispam
		}
		
		addCmd( 'gelbooru glbr', {
			short: 'hot girls',
			full: `Usage: gelbooru [tags]`
			+ `\nThis is NSFW command and only available in NSFW channels`
			+ `\nBut you can add "/safe" (or "rating:safe") tag to use it in non-NSFW channel`
		}, async ( msg, args, get_string_args ) => {
			if( !msg.member.antispam || msg.member.antispam < Date.now() )
				msg.member.antispam = Date.now() + 1337
			else
				return msg.react( '❌' )
			
			if( cd( msg.member ) > Date.now() )
				return msg.send( `**Cool down, baka!** \`${Math.floor( cd( msg.member, 1 ) - Date.now() ) / 1e3}\` seconds left` )

			let x = 1,
				sfw = false,
				force = false
			
			for( let i = 0; i < args.length; ++i )
				if( ( args[i] = args[i].toLowerCase() ).search( ' ' ) + 1 )
					args[i] = args[i].replace( /\s/g, '_' )
			
			for( let i = 0; i < args.length; ++i ){
				if( args[i] === '/safe' ){
					args[i] = 'rating:safe'
					sfw = true
				} else if( args[i] === 'rating:safe' ){
					sfw = true
				} else if( msg.author.isMaster() && /^--+force$/i.test( args[i] ) ){
					force = true
					args.splice( i, 1 )
					--i
				} else if( /^--+x\d$/i.test( args[i] ) ){
					x = Math.max( Number( args[i][args[i].length - 1] ), 1 )
					args.splice( i, 1 )
					--i
				} else if( args[i] === 'amatsuka_mao' )
					return msg.send( client.emojis.cache.get( '721677327649603594' ).toString() )
			}
			
			if( !sfw && !msg.channel.nsfw && !force )
				return msg.send( 'This isn\'t an NSFW channel!' )
			
			let tags = args.join( ' ' )
			let message = await msg.send( getRandomLoadingPhrase() )
		
			Gelbooru.q( tags )
				.then( res => postPictures( res, x, msg, message ) )
				.catch( err => {
					message.edit( { content: cb( err ), embed: null } )
					console.error( err )
				})
		})
		
		addCmd( 'yandere yndr', {
			short: 'hot girls',
			full: `Usage: yandere [tags]`
			+ `\nThis is NSFW command and only available in NSFW channels`
			+ `\nBut you can add "/safe" (or "s") tag to use it in non-NSFW channel`
		}, async ( msg, args, get_string_args ) => {
			if( !msg.member.antispam || msg.member.antispam < Date.now() )
				msg.member.antispam = Date.now() + 1337
			else
				return msg.react( '❌' )
			
			if( cd( msg.member ) > Date.now() )
				return msg.send( `**Cool down, baka!** \`${Math.floor( cd( msg.member, 1 ) - Date.now() ) / 1e3}\` seconds left` )

			let x = 1,
				sfw = false,
				force = false
		
			for( let i = 0; i < args.length; ++i )
				if( ( args[i] = args[i].toLowerCase() ).search( ' ' ) + 1 )
					args[i] = args[i].replace( /\s/g, '_' )
			
			for( let i = 0; i < args.length; ++i ){
				if( args[i] === '/safe' ){
					args[i] = 's'
					sfw = true
				} else if( args[i] === 's' ){
					sfw = true
				} else if( msg.author.isMaster() && /^-+force$/i.test( args[i] ) ){
					force = true
					args.splice( i, 1 )
					--i
				} else if( /^--+x\d$/i.test( args[i] ) ){
					x = Math.max( Number( args[i][args[i].length - 1] ), 1 )
					args.splice( i, 1 )
					--i
				} else if( args[i] === 'amatsuka_mao' )
					return msg.send( client.emojis.cache.get( '721677327649603594' ).toString() )
			}
			
			if( !sfw && !msg.channel.nsfw && !force )
				return msg.send( 'This isn\'t an NSFW channel!' );
			
			let tags = args.join( ' ' )
			let message = await msg.send( getRandomLoadingPhrase() )
		
			Yandere.q( tags )
				.then( res => postPictures( res, x, msg, message ) )
				.catch( err => {
					message.edit( { content: cb( err ), embed: null } )
					console.error( err )
				})
		})
	}
}