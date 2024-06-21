// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const discord = require( 'discord.js' )
		const Embed = require( '@/functions/Embed' )

		const size = 2048
		const extension = 'jpg'

		async function sendPFP( session, target, banner ){
			const embed = Embed()
			const isGuild = target instanceof discord.Guild
			const whose = isGuild ? 'Guild' : target.toString() + `'s`
			let url

			if( banner ){
				target = await target.fetch()

				// Discord.js didn't implemented an API endpoint and/or method for guild banners
				if( typeof target.bannerURL !== 'function' )
					return session.update( `Looks like discord.js didn't implement method for this one yet` )

				url = target.bannerURL({ size, extension })
			} else
				url = isGuild
					? target.iconURL({ size, extension })
					: target.displayAvatarURL({ size, extension })

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

			return session.update( embed )
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
			async callback({ msg, args, session }){
				const banner = args[-1] === 'banner'

				// Author's avatar
				if( !args[0] && !args.flags.guild.specified )
					return sendPFP( session, args.flags.server.specified ? msg.member : msg.author, banner )

				// Exclusion: everyone/here
				if( msg.mentions.everyone )
					return session.update( "Are You Baka?" )

				const member = await msg.guild.members.find( args.getRaw() )

				// User avatar/banner
				if( member )
					return sendPFP( session, args.flags.server.specified ? member : member.user, banner )

				// Guild icon/banner
				if( args.flags.guild.specified )
					return sendPFP( session, msg.guild, banner )

				// 404
				return session.update( 'User not found :(' )
			},
		})
	}
}
