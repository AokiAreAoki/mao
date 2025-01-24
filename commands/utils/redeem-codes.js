// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const discord = require( 'discord.js' )
		const client = require( '@/instances/client' )
		const Embed = require( '@/functions/Embed' )

		const Games = {
			gi: {
				description: 'codes for Genshin Impact',
				redeemLink: `https://genshin.hoyoverse.com/m/en/gift?code=`,
				emojiID: `1063048589770756136`,
			},
			hsr: {
				description: 'codes for Honkai: Star Rail',
				redeemLink: `https://hsr.hoyoverse.com/gift?code=`,
				emojiID: `1112055114916696114`,
			},
			zzz: {
				description: 'codes for Zenless Zone Zero',
				redeemLink: `https://zenless.hoyoverse.com/redemption?code=`,
				emojiID: `1327366628622729310`,
			},
		}

		const description = `sends fancy message with code redeem link(s)`
		const pleaseSpecifyFlag = `Please specify for which game those code(s) are using one of flags`

		const flags = Object
			.entries( Games )
			.map( ([key, game]) => [key, game.description] )

		const flagArgument = Object
			.keys( Games )
			.map( flag => `--${flag}` )
			.join( '|' )

		addCommand({
			aliases: 'redeem-codes codes',
			flags,
			description: {
				short: description,
				full: [
					description,
					pleaseSpecifyFlag,
				],
				usages: [
					[`<...codes>`, `<${flagArgument}>`, ``],
				],
			},
			callback({ args, session }){
				const codes = args.filter( s => /^\w{8,20}$/i.test(s) )

				if( codes.length === 0 )
					return session.update( `Give me some codes` )

				const flags = Object
					.keys( Games )
					.filter( flag => args.flags[flag].specified )

				if( flags.length > 1 )
					return session.update( `You can't specify multiple games` )

				if( flags.length === 0 )
					return session.update( pleaseSpecifyFlag )

				const game = Games[flags[0]]
				const emojiString = client.emojis.resolve( game.emojiID )?.toString() || ''

				const components = codes
					.map( ( code, i ) => new discord.ButtonBuilder()
						.setStyle( discord.ButtonStyle.Link )
						.setURL( game.redeemLink + code )
						.setLabel( `Redeem code #${i + 1}` )
						.setEmoji( game.emojiID )
					)
					.map( button => new discord.ActionRowBuilder()
						.addComponents( button )
					)

				const links = codes
					.map( c => `${emojiString} [${c}](${game.redeemLink + c})` )
					.join( '\n' )

				const embed = Embed()
					.setDescription( `Redeem codes:\n${links}` )

				return session.update({
					embeds: [embed],
					components,
				})
			},
		})
	}
}
