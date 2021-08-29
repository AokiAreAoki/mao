module.exports = {
	requirements: 'MM',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		MM.pushHandler( 'cdn_fixer', false, msg => {
			const badURLs = msg.content.match( /https?:\/\/media\.discordapp\.net\/\S+\.(?:mp4|webm)/g )

			if( badURLs && badURLs.length > 0 )
				msg.send( badURLs
					.map( url => url.replace( /^https?:\/\/media\.discordapp\.net/, 'https://cdn.discordapp.com' ) )
					.join( '\n' )
				)
		})
	}
}
