// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )
		const discord = require( 'discord.js' )
		const Embed = require( '@/functions/Embed' )

		const emojiID = `1063048589770756136`
		const redeemLink = `https://genshin.hoyoverse.com/m/en/gift?code=`

		addCommand({
			aliases: 'redeem-codes codes',
			description: {
				single: `sends fancy message with code redeem links`,
				usages: [
					[`<...codes>`, ``],
				],
			},
			callback( msg, args ){
				let codes = args.filter( s => /^\w{8,16}$/i.test(s) )

				if( codes.length === 0 )
					return msg.send( `Give me some codes` )

				const emoji = client.emojis.resolve( emojiID )
				const components = codes
					.map( ( code, i ) => new discord.ButtonBuilder()
						.setStyle( discord.ButtonStyle.Link )
						.setURL( redeemLink + code )
						.setLabel( `Redeem code #${i+1}` )
						.setEmoji( emojiID )
					)
					.map( button => new discord.ActionRowBuilder()
						.addComponents( button )
					)

				codes = codes
					.map( c => `${emoji.toString()} [${c}](${redeemLink + c})` )
					.join( '\n' )

				const embed = Embed()
					.setDescription( `Redeem codes:\n${codes}` )

				return msg.send({
					embeds: [embed],
					components,
				})
			},
		})
	}
}
