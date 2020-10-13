module.exports = {
	requirements: 'embed',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd( 'simplevote vote', 'simple vote', async ( msg, args, get_string_args ) => {
			let m = await msg.send( embed()
				.setAuthor( msg.author.tag, msg.author.avatarURL(64) )
				.addField( 'Vote:', get_string_args() )
			)
			
			await m.react( '✅' )
			await m.react( '❌' )
		})
	}
}