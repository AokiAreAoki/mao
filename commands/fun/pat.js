// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const discord = require( 'discord.js' )
		const pet = require( 'pet-pet-gif' )
		const Embed = require( '@/functions/Embed' )
		const processing = require( '@/functions/processing' )

		addCommand({
			aliases: 'pat pet',
			description: {
				single: 'pats ppl',
				examples: [
					['<@@>', 'pats $1'],
					['<url>', 'pats $1'],
				],
			},
			async callback({ msg, args, session }){
				let url = args[0]?.trim() || await msg.findRecentImage()

				if( !url )
					return session.update( `No media found or provided` )

				session.update( Embed().setDescription( processing() ) )
				const embed = Embed().setImage( 'attachment://pat.gif' )

				if( !url.matchFirst( /^https?:\/\// ) ){
					const member = await msg.guild.members.find( url )

					if( !member )
						return session.update( 'User not found' )

					url = member.user.avatarURL({ extension: 'jpg' })
					embed.setDescription( `You are patting ${member}\nThey must be really happy rn` )
				}

				const gif = await pet( url )
					.catch( async err => {
						await session.update( `Something went wrong :(` )
						throw err
					})

				return session.update({
					embeds: [embed],
					files: [new discord.AttachmentBuilder( gif, { name: 'pat.gif' } )],
				})
			},
		})
	}
}
