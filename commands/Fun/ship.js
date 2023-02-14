// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		function randomPos( string ){
			return Math.floor( string.length * .25 + Math.random() * string.length * .5 )
		}

		addCommand({
			aliases: 'ship',
			description: 'combines names of 2 users',
			async callback( msg, args ){
				const user1 = await msg.guild.members.find( args[0] )
				const user2 = await msg.guild.members.find( args[1] )

				if( !user1 )
					return msg.send( `Gimme 2 users` )
				else if( !user2 )
					return msg.send( `Gimme 2nd user` )

				const name1 = user1.user.username
				const firstPart = name1.substring( 0, randomPos( name1 ) )

				const name2 = user2.user.username
				const secondPart = name2.substring( randomPos( name2 ) )

				msg.send( `${user1} + ${user2} = ${firstPart + secondPart}` )
			},
		})
	}
}