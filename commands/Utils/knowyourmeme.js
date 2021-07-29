module.exports = {
	requirements: 'kym',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		const MAX = 4096
		
		function cut( text ){
			return text.length > MAX
				? text.substr( 0, MAX - 4 ) + ' ...'
				: text
		}

		addCmd({
			aliases: 'knowyourmeme kym',
			description: {
				short: 'looks for a meaning of a meme',
				full: [
					'looks for a meaning of a meme on <https://www.knowyourmeme.com/>',
				],
				usages: [
					['<meme>', 'looks for a meaning of the $1'],
				],
			},
			callback: ( msg, args ) => {
				const meme = args.get_string()

				if( meme )
					kym.search( meme )
						.then( meaning => {
							//msg.send( embed().addField( meaning.name, cut( meaning.about ) ) )
							msg.send( embed().setDescription( `**${meaning.name}** - ${cut( meaning.about )}` ) )
						})
						.catch( err => {
							msg.send( embed()
								.setColor( 0xFF0000 )
								.setDescription( `The \`${meme}\` meme not found :c` )
							)
						})
				else
					msg.send( 'gimme a meme baka' )
			},
		})
	}
}