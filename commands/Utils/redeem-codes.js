// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )
		const discord = require( 'discord.js' )
		const Embed = require( '@/functions/Embed' )

		const primogemEmojiID = `1063048589770756136`
		const stellarJadeEmojiID = `1112055114916696114`

		const GIRedeemLink = `https://genshin.hoyoverse.com/m/en/gift?code=`
		const HSRRedeemLink = `https://hsr.hoyoverse.com/gift?code=`

		addCommand({
			aliases: 'redeem-codes codes',
			flags: [
				['gi', 'codes for genshin impact'],
				['hsr', 'codes for honkai star rail'],
			],
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

				const gi = args.flags.gi.specified
				const hsr = args.flags.hsr.specified
				let redeemLink, emojiID

				if( gi ){
					if( hsr )
						return msg.send( `You can't specify both flags` )

					redeemLink = GIRedeemLink
					emojiID = primogemEmojiID
				} else if( hsr ){
					redeemLink = HSRRedeemLink
					emojiID = stellarJadeEmojiID
				} else {
					return msg.send( `Please specify for which game those code(s) are using one of the following flags: \`--gi\`, \`--hsr\`` )
				}

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
