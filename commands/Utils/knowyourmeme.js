// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const kym = require( 'nodeyourmeme' )
		const Embed = require( '@/functions/Embed' )
		const MAX = 4096

		function cut( text ){
			return text.length > MAX
				? text.substr( 0, MAX - 4 ) + ' ...'
				: text
		}

		addCommand({
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
				const meme = args.getRaw()

				return meme
					? kym.search( meme )
						.then( meaning => msg.send( Embed()
							.setDescription( `**${meaning.name}** - ${cut( meaning.about )}` )
						))
						.catch( () => msg.send( Embed()
							.setColor( 0xFF0000 )
							.setDescription( `The \`${meme}\` meme is not found :c` )
						))
					: msg.send( 'gimme a meme baka' )
			},
		})
	}
}