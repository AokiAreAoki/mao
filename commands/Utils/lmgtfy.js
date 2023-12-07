// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const Embed = require( '@/functions/Embed' )
		const wait = require( '@/functions/wait' )
		const urlBase = 'https://lmgtfy.com/?q='

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
			async callback({ session, args }){
				const q = args.getRaw()
				const iie = args.flags.iie.specified ? '&iie=1' : ''
				const whatIs = args[-1].toLowerCase().startsWith( 'what' ) ? 'What is ' : ''
				const timeout = 1337 + Math.random() * 3e3

				if( !q )
					return session.update( 'Usage: `-help lmgtfy`' )

				const url = urlBase + encodeURI( ( whatIs + q ).replace( /\s+/g, '+' ) ) + iie

				session.update( Embed()
					.addFields({
						name: `OK 👌. Googling \`${whatIs + q}\`...`,
						value: 'Please wait a bit :^)'
					})
				)

				await wait( timeout )

				session.update( Embed()
					.addFields({
						name: 'Found!',
						value: `Click here to find out ${whatIs.toLowerCase()}[${q}](${url})`,
					})
				)
			},
		})
	}
}
