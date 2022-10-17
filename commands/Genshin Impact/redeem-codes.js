// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )
		const discord = require( 'discord.js' )
		const Embed = require( '@/functions/Embed' )

		const redeemLink = `https://genshin.hoyoverse.com/m/en/gift?code=`

		addCommand({
			aliases: 'redeem-codes codes',
			description: {
				single: `sends fancy messages with code redeem links`,
				usages: [
					[`<...codes>`, ``],
				],
			},
			callback( msg, args ){
				let codes = args.filter( s => /^\w{8,16}$/i.test(s) )

				if( codes.length === 0 )
					return msg.send( `Give me some codes` )

				const emoji = client.emojis.resolve( `977190531291557889` )
				const components = codes
					.map( ( code, i ) => new discord.MessageButton()
						.setStyle( `LINK` )
						.setURL( redeemLink + code )
						.setLabel( `Redeem code #${i+1}` )
						.setEmoji( emoji )
					)
					.map( button => new discord.MessageActionRow()
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
