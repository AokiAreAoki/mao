module.exports = {
	requirements: 'Embed',
	init: ( requirements, mao ) => {
		requirements.define( global )

		addCmd({
			aliases: 'lmgtfy lmg whatis whats',
			flags: [
				['iie', `includes internet explorer`],
			],
			description: {
				short: 'let me google that for you (or someone else)',
				full: 'Googles stuff for you (or someone else)',
				usages: [
					[`<search request>`, 'googles $1'],
				],
			},
			callback: async ( msg, args ) => {
				let url = 'https://lmgtfy.com/?q=',
					q = args.get_string(),
					iie = args.flags.iie ? '&iie=1' : '',
					whatis = args[-1].toLowerCase().startsWith( 'what' ) ? 'What is ' : '',
					timeout = 1337 + Math.random() * 3e3

				if( !q )
					return msg.send( 'Usage: `-help lmgtfy`' )

				url += encodeURI( ( whatis + q ).replace( /\s+/g, '+' ) ) + iie

				msg.send( Embed()
					.addField( `OK 👌. Googling \`${whatis + q}\`...`, 'Please wait a bit :^)' )
				).then( m => {
					setTimeout( () => {
						m.edit( Embed().addField( 'Found!', `Click here to find out ${whatis.toLowerCase()}[${q}](${url})` ) )
					}, timeout )
				})
			},
		})
	}
}
