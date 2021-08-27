module.exports = {
	requirements: 'Embed',
	init: ( requirements, mao ) => {
		requirements.define( global )

		addCmd({
			aliases: 'lmgtfy lmg whatis whats',
			description: {
				short: 'lemme googles that for ya (or someone else)',
				full: 'Googles stuff for you (or someone else)',
				usages: [
					[`<search request>`, 'googles $1'],
					[`<search request>`, `--iie`, 'googles $1 and includes internet expainer'],
				],
			},
			callback: ( msg, args ) => {
				let url = 'https://lmgtfy.com/?q=',
					q = args.get_string(),
					iie = '',
					whatis = args[-1].toLowerCase().startsWith( 'what' ) ? 'What is ' : '',
					timeout = 1337 + Math.random() * 3e3
				
				if( !q )
					return msg.send( 'Usage: `-help lmgtfy`' )

				if( q.matchFirst( /(^|[\s\n]+)-+iie\b/i ) ){
					q = q.replace( /(^|[\s\n]+)-+iie\b/i, '' )
					iie = '&iie=1'
				}

				url += encodeURI( ( whatis + q ).replace( /\s+/g, '+' ) ) + iie

				msg.send( Embed()
					.addField( `OK 👌. Googling \`${whatis + q}\`...`, 'Please wait a bit :^)' )
				).then( m => {
					setTimeout( () => m.edit( Embed().addField( 'Found!', `Click here to find out ${whatis.toLowerCase()}[${q}](${url})` ) ), timeout )
				})
			},
		})
	}
}