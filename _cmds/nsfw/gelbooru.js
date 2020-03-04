async ( msg, args, cmd ) => {
	return msg.channel.send( 'Gelbooru disabled :(' ) /////

	let tags = cmd.substring( args[0].length + 1 ).toLowerCase()
	let safe = false
	let tags_array = tags.match( /\S+/g )

	if( tags_array ){
		for( let k in tags_array ){
			if( tags_array[k] == '/safe' ){
				safe = true
				tags = tags.replace( /\/safe/g, 'rating:safe' )
				break
			}

			if( tags_array[k] == 'rating:safe' ){
				safe = true
				break
			}
		}
	}
	
	if( !safe && !msg.channel.nsfw )
		return msg.channel.send( 'This isn\'t an NSFW channel!' );
	
	let message = await msg.channel.send( getRandomLoadingPhrase() )

	httpsGet( `https://gelbooru.com/index.php?page=dapi&s=post&q=index&tags=${tags}&limit=100&json=1`, body => {
		try {
			body = JSON.parse( body )
		} catch( err ){
			message.edit( new ds.RichEmbed()
				.setDescription( `Tag(s) \`${tags}\` not found :c` )
				.setColor( 0xFF0000 )
			)
			return
		}
		
		if( body.length == 0 ){
			message.edit( new ds.RichEmbed()
				.setDescription( `Tag(s) \`${tags}\` not found :c` )
				.setColor( 0xFF0000 )
			)
			return
		}
		
		let timeout = curtime() + 1
		let r = Math.floor( Math.random() * body.length )
		while( !body[r] && timeout > curtime() ) 
			r = Math.floor( Math.random() * body.length );
		
		if( !tags.match( /\S/ ) ) tags = 'no tags';
		
		let emb = new ds.RichEmbed()
			.setDescription( `[${tags}](${body[r].file_url})` )
			.setImage( body[r].file_url )
			.setColor( maoclr )
			.setFooter( 'Powered by gelbooru.com' )
		
		message.edit( emb )
		wait.delete()
	}, err => message.edit( cb( err ) ) )
}