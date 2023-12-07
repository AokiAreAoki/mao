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

		const description = `sends fancy message with code redeem link(s)`
		const pleaseSpecifyFlag = `Please specify for which game those code(s) are using one of flags`

		addCommand({
			aliases: 'redeem-codes codes',
			flags: [
				['gi', 'codes for genshin impact'],
				['hsr', 'codes for honkai star rail'],
			],
			description: {
				short: description,
				full: [
					description,
					pleaseSpecifyFlag,
				],
				usages: [
					[`<...codes>`, `<--gi|--hsr>`, ``],
				],
			},
			callback({ args, session }){
				let codes = args.filter( s => /^\w{8,16}$/i.test(s) )

				if( codes.length === 0 )
					return session.update( `Give me some codes` )

				const gi = args.flags.gi.specified
				const hsr = args.flags.hsr.specified
				let redeemLink, emojiID

				if( gi ){
					if( hsr )
						return session.update( `You can't specify both flags` )

					redeemLink = GIRedeemLink
					emojiID = primogemEmojiID
				} else if( hsr ){
					redeemLink = HSRRedeemLink
					emojiID = stellarJadeEmojiID
				} else {
					return session.update( pleaseSpecifyFlag )
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

				return session.update({
					embeds: [embed],
					components,
				})
			},
		})
	}
}
