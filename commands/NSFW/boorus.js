module.exports = {
	requirements: 'client httpGet embed',
	execute: ( requirements, mao ) => {
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
				unused = []
			
			pics.forEach( pic => {
				if( !used[pic.id] || Date.now() - used[pic.id] < 3600e3 )
					unused.push( pic )
			})
			
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
		
			//httpGet( 'https://aoki.000webhostapp.com/glbr/search/?token=V4OrT6KatVcyHOLaDIVC6yQTNp3RVFKMa47Obwdvee4dc&q=' + tags, pics => {
			httpGet( `https://gelbooru.com/index.php?page=dapi&s=post&q=index&tags=${tags}&limit=100&json=1`, pics => {
				try {
					pics = JSON.parse( pics )
				} catch( err ){
					message.edit( embed()
						.setDescription( `Tag(s) \`${tags}\` not found :c` )
						.setColor( 0xFF0000 )
					)
					return
				}
				
				if( !/\S/.test( tags ) )
					tags = 'no tags'
				
				if( pics.length === 0 )
					return message.edit( embed()
						.setDescription( `Tag(s) \`${tags}\` not found :c` )
						.setColor( 0xFF0000 )
					).then( m => m.edit( '' ) )
				
				getNewPics( tags, pics, x, msg, pic => {
					let post = embed()
						.setDescription( `[${tags}](https://gelbooru.com/index.php?page=post&s=view&id=${pic.id})` )
						.setImage( pic.file_url )
						.setFooter( 'Powered by gelbooru.com' )
					
					if( x === 1 )
						message.edit( post )
							.then( m => m.edit( '' ) )
					else
						msg.send( post )
				})
				
				if( !msg.author.isMaster() ) ++x
				cd( msg.member, x )
				delete msg.member.antispam

				if( x !== 1 )
					message.delete( 1337 )
			}, err => {
				message.edit( cb( err ) )
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
		
			httpGet( 'https://yande.re/post.json?page=1&limit=100&tags=' + tags, pics => {
				try {
					pics = JSON.parse( pics )
				} catch( err ){
					message.edit( embed()
						.setDescription( `Tag(s) \`${tags}\` not found :c` )
						.setColor( 0xFF0000 )
					)
					return
				}

				if( !/\S/.test( tags ) )
					tags = 'no tags';
				
				if( pics.length == 0 )
					return message.edit( embed()
						.setDescription( `Tag(s) \`${tags}\` not found :c` )
						.setColor( 0xFF0000 )
					)
				
				getNewPics( tags, pics, x, msg, pic => {
					let post = embed()
						.setDescription( `[${tags}](https://yande.re/post/show/${pic.id})` )
						.setImage( pic.sample_url )
						.setFooter( 'Powered by yande.re' )
					
					if( x === 1 )
						message.edit( post )
							.then( m => m.edit( '' ) )
					else
						msg.send( post )
				})
				
				if( !msg.author.isMaster() ) ++x
				cd( msg.member, x )
				delete msg.member.antispam

				if( x !== 1 )
					message.delete( 1337 )
			}, err => {
				message.edit( cb( err ) )
				console.error( err )
			})
		})
	}
}