// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const clamp = require( '@/functions/clamp' )
		const MAX_ROLLS = 50

		addCommand({
			aliases: 'roll',
			flags: [
				['x', `<amount>`, `$1 of numbers to roll (max: ${MAX_ROLLS})`],
			],
			description: {
				single: 'rolls a dice',
				usages: [
					['rolls random number from 0 to 100'],
					['<max>', 'rolls random number from 0 to $1'],
					['<min>', '<max>', 'rolls random number from $1 to $2'],
				],
			},
			callback({ msg, args, session }){
				let rolls = args.flags.x.specified && parseInt( args.flags.x[0] )
				rolls = clamp( rolls || 1, 1, 50 )

				let min = parseInt( args[0] )
				let max = parseInt( args[1] )

				if( isNaN( min ) ){
					min = 0
					max = 100
				} else if( isNaN( max ) ){
					max = min
					min = 0
				}

				const numbers = Array( rolls )
					.fill()
					.map( () => `**${min + Math.floor( Math.random() * ( max + 1 - min ) )}**` )
					.join( ', ' )

				session.update( `**${msg.member.displayName}** rolled ${numbers}` )
			},
		})

		addCommand({
			aliases: 'select choose',
			description: 'Selects one of the given variants',
			callback({ args, session }){
				if( args.length === 0 )
					return session.update( 'Gimme something to choose, baka' )

				const r = Math.floor( Math.random() * args.length )
				session.update( `I ${args[-1]} **${args[r].replace( /\\*@/g, '\\@' )}**` )
			},
		})

		const rps = ['rock', 'paper', 'scissors']

		addCommand({
			aliases: 'rps',
			description: 'rock paper scissors',
			callback({ args, session }){
				const mao = Math.floor( Math.random() * 3 )
				const user = args[0]
					? rps.findIndex( v => v.startsWith( args[0].toLowerCase() ) )
					: Math.floor( Math.random() * 3 )

				let result = ( mao - user + 4 ) % 3 - 1

				session.update(
					`**You**: ${rps[user]}!\n**Mao**: ${rps[mao]}!\n` +
					( result === 0 ? 'DRAW' : ( result === 1 ? 'You lose 😭' : '**You WON! 😎**' ) )
				)
			},
		})
	}
}