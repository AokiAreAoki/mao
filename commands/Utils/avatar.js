// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const discord = require( 'discord.js' )
		const Embed = require( '@/functions/Embed' )

		async function sendPFP( messageOrChannel, target, banner ){
			const embed = Embed()
			const isGuild = target instanceof discord.Guild
			const whose = isGuild ? 'Guild' : target.toString() + `'s`
			let url

			if( banner ){
				target = await target.fetch()

				// le discord le didn't implemented an API endpoint for guild banners
				if( typeof target.bannerURL !== 'function' )
					return messageOrChannel.send(
						`ahahahaha...... oopsie, looks like le discord le didn't implemented an API endpoint for guild banners! ahaha... who could've guess lol`
					)

				url = target.bannerURL({ size: 2048, dynamic: true })
			} else
				url = isGuild
					? target.iconURL({ size: 1024, dynamic: true })
					: target.displayAvatarURL({ size: 2048, dynamic: true })

			if( url ){
				const type = banner ? 'banner' : isGuild ? 'icon' : 'avatar'
				embed.setDescription( `${whose} ${type}` )
				embed.setImage( url )
			} else if( target.accentColor ){
				const hex = target.accentColor.toString(16).toUpperCase().padStart( 6, '0' )
				embed.setDescription( `${whose} accent color is \`#${hex}\`` )
				embed.setColor( target.accentColor )
			} else
				embed.setDescription( isGuild
					? `Guild does not have a banner`
					: `${target.toString()} does not have a banner nor an accent color`
				)

			return messageOrChannel.send( embed )
		}

		addCommand({
			aliases: 'avatar pfp banner',
			flags: [
				['guild', 'gets guild icon/banner'],
				['server', 'gets server avatar/banner of a user'],
			],
			description: {
				short: `gets avatar/banner of a user/guild`,
				full: [
					`gets an avatar/banner of a user/guild`,
					'* use `banner` alias of this command to get a banner',
				],
				usages: [
					['gets your avatar/banner'],
					['--guild', 'gets guild icon/banner'],
					[`<@@>`, `gets $1's avatar/banner`],
					[`<username>`, `searches for a user and gets their avatar/banner`],
				],
			},
			async callback( msg, args ){
				const banner = args[-1] === 'banner'

				// Author's avatar
				if( !args[0] && !args.flags.guild.specified )
					return sendPFP( msg, args.flags.server.specified ? msg.member : msg.author, banner )

				// Exclusion: everyone/here
				if( msg.mentions.everyone )
					return msg.send( "Are You Baka?" )

				const member = await msg.guild.members.find( args.getRaw() )

				// User avatar/banner
				if( member )
					return sendPFP( msg, args.flags.server.specified ? member : member.user, banner )

				// Guild icon/banner
				if( args.flags.guild.specified )
					return sendPFP( msg, msg.guild, banner )

				// 404
				return msg.send( 'User not found :(' )
			},
		})
	}
}
