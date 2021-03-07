module.exports = {
	requirements: 'embed httpGet',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		let months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ]
		
		addCmd( 'urban', { short: 'searches for word difination on https://www.urbandictionary.com/', full: 'Using: `urban smth`' }, ( msg, args, get_string_args ) => {
			let q = get_string_args()
			
			if( !q ){
				msg.send( 'Gimme a word some baka~!' )
				return
			}
			
			httpGet( `http://api.urbandictionary.com/v0/define?term={${q}}`, body => {
				try {
					let res = JSON.parse( body ).list[0]
					
					if( !res ){
						msg.send( 'Word not found :(' )
						return
					}
					
					let def = res.definition.replace( /\[(.*?)\](?!\(https?:\/\/.*?\))/g, ( _, p1 ) => `[${p1}](https://www.urbandictionary.com/define.php?term=${ encodeURI( p1 ) })` )
					let exmp = res.example.replace( /\[(.*?)\](?!\(https?:\/\/.*?\))/g, ( _, p1 ) => `[${p1}](https://www.urbandictionary.com/define.php?term=${ encodeURI( p1 ) })` )
					let date = new Date( res.written_on )
					
					msg.send( embed()
						.setAuthor( '@' + msg.member.user.tag, msg.member.user.avatarURL )
						.addField( 'Word', `[${ res.word }](${ res.permalink })` )
						.addField( 'Definition', def.length > 1024 ? def.substring( 0, 1021 ).replace( /(.+)[\s\n].*$/, '$1...' ) : def )
						.addField( 'Example', `*${exmp}*` )
						.addField( 'Thumbs', `:thumbsup: ${res.thumbs_up} :thumbsdown: ${res.thumbs_down}`)
						.setFooter( `Defined by ${res.author} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}` )
					)
				} catch( err ){
					msg.sendcb( err )
				}
			}, msg.sendcb )
		})
	}
}