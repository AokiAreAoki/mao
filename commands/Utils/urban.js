module.exports = {
	requirements: 'Embed httpGet',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		let months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ]
		
		addCmd({
			aliases: 'urban',
			description: {
				short: 'looks for a definition of a word/phrase',
				full: [
					'looks for a definition on <https://www.urbandictionary.com/>',
				],
				usages: [
					['<word/phrase>', 'looks for a definition of the $1'],
				],
			},
			callback: ( msg, args ) => {
				let q = args.get_string()
				
				if( !q ){
					msg.send( 'Gimme a word baka~!' )
					return
				}
				
				httpGet( `http://api.urbandictionary.com/v0/define?term={${q}}`, body => {
					const definitions = JSON.parse( body )?.list
					
					if( !definitions )
						return msg.send( 'Definition not found :(' )
					
					msg.author.createPaginator()
						.setPages( definitions.length )
						.onPageChanged( ( page, pages ) => {
							const definition = definitions[page]

							// creating links
							const def = definition.definition.replace( /\[(.*?)\](?!\(https?:\/\/.*?\))/g, ( _, p1 ) => `[${p1}](https://www.urbandictionary.com/define.php?term=${ encodeURI( p1 ) })` )
							const exmp = definition.example.replace( /\[(.*?)\](?!\(https?:\/\/.*?\))/g, ( _, p1 ) => `[${p1}](https://www.urbandictionary.com/define.php?term=${ encodeURI( p1 ) })` )
							const date = new Date( definition.written_on )
							
							return Embed()
								.setAuthor( '@' + msg.member.user.tag, msg.member.user.avatarURL )
								.addField( `Word (${page + 1}/${pages})`, `[${ definition.word }](${ definition.permalink })` )
								.addField( 'Definition', def.length > 1024 ? def.substring( 0, 1021 ).replace( /(.+)[\s\n].*$/, '$1...' ) : def )
								.addField( 'Example', `*${exmp}*` )
								.addField( 'Thumbs', `:thumbsup: ${definition.thumbs_up} :thumbsdown: ${definition.thumbs_down}` )
								.setFooter( `Defined by ${definition.author} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}` )
						})
						.createMessage( msg )
				}, msg.sendcb )
			},
		})
	}
}
