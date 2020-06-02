module.exports = {
	requirements: 'httpGet embed',
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
			'owo',
			'Pervert...',
			'Calm down, weeby...',
			'<insert loading text here>...',
			':police_car:...',
		]
		
		let getRandomLoadingPhrase = () => loadingPhrases[ Math.floor( Math.random() * loadingPhrases.length ) ]
		
		addCmd( 'gelbooru', {
			short: 'hot girls',
			full: `Usage: gelbooru [tags]`
			+ `\nThis is NSFW command and only available in NSFW channels`
			+ `\nBut u can add "/safe" (or "rating:safe") tag to use it in non-NSFW channel`
		}, async ( msg, args, cmd ) => {
			let sfw = false
			
			for( let i = 0; i < args.length; ++i )
				if( args[i].search( ' ' ) != -1 )
					args[i] = args[i].replace( /\s/g, '_' )
			
			for( let i = 0; i < args.length; ++i ){
				if( args[i] == '/safe' ){
					args[i] = 'rating:safe'
					sfw = true
				} else if( args[i] == 'rating:safe' )
					sfw = true
			}
			
			if( !sfw && !msg.channel.nsfw )
				return msg.send( 'This isn\'t an NSFW channel!' )
			
			let tags = args.join( ' ' )
			let message = await msg.send( getRandomLoadingPhrase() )
		
			httpGet( `https://gelbooru.com/index.php?page=dapi&s=post&q=index&tags=${tags}&limit=100&json=1`, pics => {
			//httpGet( 'https://aoki.000webhostapp.com/glbr/search/?token=V4OrT6KatVcyHOLaDIVC6yQTNp3RVFKMa47Obwdvee4dc&q=' + tags, pics => {
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
				
				let r = Math.floor( Math.random() * pics.length )
				let timeout = Date.now() + 228
				while( !pics[r] && timeout > Date.now() ) 
					r = Math.floor( Math.random() * pics.length );
				
				if( !/\S/.test( tags ) ) tags = 'no tags'
				
				message.edit( embed()
					.setDescription( `[${tags}](https://gelbooru.com/index.php?page=post&s=view&id=${pics[r].id})` )
					.setImage( pics[r].file_url )
					.setFooter( 'Powered by gelbooru.com' )
				).then( m => m.edit( '' ) )
			}, err => message.edit( cb( err ) ) )
		})
		
		addCmd( 'yandere', {
			short: 'hot girls',
			full: `Usage: yandere [tags]`
			+ `\nThis is NSFW command and only available in NSFW channels`
			+ `\nBut u can add "/safe" (or "s") tag to use it in non-NSFW channel`
		}, async ( msg, args, get_string_args ) => {
			let sfw = false
		
			for( let i = 0; i < args.length; ++i )
				if( args[i].search( ' ' ) != -1 )
					args[i] = args[i].replace( /\s/g, '_' )
			
			for( let i = 0; i < args.length; ++i ){
				if( args[i] == '/safe' ){
					args[i] = 's'
					sfw = true
				} else if( args[i] == 's' )
					sfw = true
			}
			
			if( !sfw && !msg.channel.nsfw )
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
				
				if( pics.length == 0 )
					return message.edit( embed()
						.setDescription( `Tag(s) \`${tags}\` not found :c` )
						.setColor( 0xFF0000 )
					)
				
				let r = Math.floor( Math.random() * pics.length )
				let timeout = Date.now() + 228
				while( !pics[r] && timeout > Date.now() ) 
					r = Math.floor( Math.random() * pics.length );
				
				if( !/\S/.test( tags ) ) tags = 'no tags';
					
				message.edit( embed()
					.setDescription( `[${tags}](https://yande.re/post/show/${pics[r].id})` )
					.setImage( pics[r].sample_url )
					.setFooter( 'Powered by yande.re' )
				).then( m => m.edit( '' ) )
			}, err => message.edit( cb( err ) ) )
		})
	}
}