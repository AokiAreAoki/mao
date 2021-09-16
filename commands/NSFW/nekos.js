module.exports = {
	requirements: 'httpGet Embed',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'nekos',
			description: {
				short: 'a bit less but still hot girls',
				full: 'sends a random pic from `nekos.life` by specified category',
				usages: [
					['sends list of all categories'],
					['<category>', 'sends a random pic from $1'],
				],
			},
			flags: [
				['force', `force post ignoring the only NSFW channel restiction (master only)`],
			],
			callback: ( msg, args ) => {
				if( args[0] ){
					if( !msg.channel.nsfw && ( !args.flags.force || !msg.author.isMaster() ) )
						return msg.channel.send( "This isn't an NSFW channel!" )
					
					httpGet( "https://nekos.life/api/v2/img/" + args[0].toLowerCase(), body => {
						body = JSON.parse( body )

						if( body.msg ){
							msg.send( Embed()
								.setDescription( '**Error**: ' + body.msg )
								.setColor( 0xFF0000 )
							)
						} else {
							msg.send( Embed()
								.setDescription( `[${args[0]}](${body.url})` )
								.setImage( body.url )
								.setFooter( 'Powered by nekos.life' )
							)
						}
					}, msg.sendcb )
				} else {
					httpGet( "https://nekos.life/api/v2/endpoints", body => {
						let m = body.match( /(?:'\w+?').*(?=>)/ )[0]

						msg.send( Embed()
							.addField( 'Tags:', m.match( /\w+/g ).sort().join( ', ' ) )
							.setFooter( 'Powered by nekos.life' )
						)
					}, msg.sendcb )
				}
			},
		})
	}
}