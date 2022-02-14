module.exports = {
	requirements: 'pet processing',
	init: ( requirements, mao ) => {
		requirements.define( global )

		addCmd({
			aliases: 'pet-pet pet',
			description: {
				single: 'pets ppl',
				examples: [
					['<@@>', 'pets $1'],
					['<url>', 'pets $1'],
				],
			},
			async callback( msg, args ){
				let url = args[0] || await msg.findLastPic()

				if( !url )
					return msg.send( `No media found or provided` )

				const message = msg.send( processing() )
				const embed = Embed()
					.setImage( 'attachment://pet.gif' )

				if( !url.matchFirst( /^https?:\/\// ) ){
					const member = await msg.guild.members.find( url )

					if( !member )
						return ( await message ).edit( 'User not found' )

					url = member.user.avatarURL({ format: 'jpg' })
					embed.setDescription( `${member.toString()} must be really happy rn` )
				}

				const gif = await pet( url )
					.catch( async err => {
						( await message ).edit( `Something went wrong :(` )
						throw err
					})

				return ( await message ).edit({
					content: null,
					embeds: [embed],
					files: [
						new discord.MessageAttachment( gif, 'pet.gif' )
					],
				})
			},
		})
	}
}