// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const Embed = require( '@/functions/Embed' )

		addCommand({
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
			callback: ( msg, args ) => {
				let url = 'https://lmgtfy.com/?q=',
					q = args.getRaw(),
					iie = args.flags.iie.specified ? '&iie=1' : '',
					whatis = args[-1].toLowerCase().startsWith( 'what' ) ? 'What is ' : '',
					timeout = 1337 + Math.random() * 3e3

				if( !q )
					return msg.send( 'Usage: `-help lmgtfy`' )

				url += encodeURI( ( whatis + q ).replace( /\s+/g, '+' ) ) + iie

				return new Promise( resolve => {
					msg.send( Embed()
						.addFields({
							name: `OK 👌. Googling \`${whatis + q}\`...`,
							value: 'Please wait a bit :^)'
						})
					)
						.then( m => {
							setTimeout( () => {
								resolve( m.edit( Embed()
									.addFields({
										name: 'Found!',
										value: `Click here to find out ${whatis.toLowerCase()}[${q}](${url})`,
									})
								))
							}, timeout )
						})
				})
			},
		})
	}
}
