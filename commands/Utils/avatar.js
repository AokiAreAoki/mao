module.exports = {
	requirements: 'discord Embed client',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		async function sendPFP( messageOrChannel, target, banner ){
			target = target.user ?? target // user/member/guild
			
			const embed = Embed()
			const isGuild = target instanceof discord.Guild
			const whose = isGuild ? 'Server' : target.toString() + `'s`
			const url = banner
				? ( await target.fetch() ).bannerURL({ size: 2048, dynamic: true })
				: isGuild
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
					? `Server does not have banner`
					: `${target.toString()} does not have banner nor accent color`
				)
			
			return messageOrChannel.send( embed )
		}
		
		addCmd({
			aliases: 'avatar pfp banner',
			description: {
				short: `gets avatar/banner of an user or server`,
				full: [
					`gets avatar/banner of an user or server`,
					'* use `banner` alias of this command to get banner',
				],
				usages: [
					['gets your avatar/banner'],
					['server', 'gets server icon/banner'],
					[`<@@>`, `gets $1's avatar/banmer`],
					[`<username>`, `searches for a user and gets their avatar/banner`],
				],
			},
			callback: async ( msg, args ) => {
				const banner = args[-1] === 'banner'
				
				// Author's avatar
				if( !args[0] )
					return sendPFP( msg, msg.author, banner )
				
				// Server icon
				if( args[0].toLowerCase() === 'server' )
					return sendPFP( msg, msg.guild, banner )
				
				// Mao's avatar
				if( args[0].toLowerCase() === 'mao' )
					return sendPFP( msg, client.user, banner )
				
				// Exclusion: everyone/here
				if( msg.mentions.everyone )
					return msg.send( "Are You Baka?" )
				
				// Search for user by name
				const member = await msg.guild.members.find( args.get_string() )
				
				if( member )
					return sendPFP( msg, member.user, banner )
				
				return msg.send( 'User not found :(' )
			},
		})
	}
}
