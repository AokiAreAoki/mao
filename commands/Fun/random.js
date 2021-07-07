module.exports = {
	requirements: 'client clamp',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'roll',
			description: {
				single: 'rolls a dice',
				usages: [
					['rolls random number from 0 to 100'],
					['<max>', 'rolls random number from 0 to $1'],
					['<min>', '<max>', 'rolls random number from $1 to $2'],
				],
			},
			callback: ( msg, args ) => {
				let x = 1

				for( let i = 0; i < args.length; ++i ){
					let xx = args[i].matchFirst( /^x(\d{1,3})/i )

					if( xx ){
						x = clamp( Number( xx ), 1, 50 )
						args.splice( i, 1 )
						break
					}
				}

				let min = parseInt( args[0] )
				let max = parseInt( args[1] )
				
				if( isNaN( min ) ){
					min = 0
					max = 100
				} else if( isNaN( max ) ){
					max = min
					min = 0
				}

				let nums = []

				for( let i = 0; i < x; ++i )
					nums.push( min + Math.round( Math.random() * ( max - 1 ) ) + 1 )
				
				msg.send( `**${msg.member.displayName}** rolled **${nums.join( '**, **' )}**` )
			},
		})

		addCmd({
			aliases: 'select choose',
			description: 'Selects one of the given variants',
			callback: ( msg, args ) => {
				if( args.length === 0 )
					return msg.send( 'Gimme something to choose, baka' )

				let r = Math.floor( Math.random() * args.length )
				msg.send( `I ${args[-1]} **${args[r].replace( /\\*@/g, '\\@' )}**` )
			},
		})
		
		const rps = ['rock', 'paper', 'scissors']

		addCmd({
			aliases: 'rps',
			description: 'rock paper scissors',
			callback: ( msg, args ) => {
				let mao = Math.floor( Math.random() * 3 )
				let user = args[0]
					? rps.findIndex( v => v.startsWith( args[0].toLowerCase() ) )
					: Math.floor( Math.random() * 3 )
				
				let result = ( mao - user + 4 ) % 3 - 1
				
				msg.send(
					`**You**: ${rps[user]}!\n**Mao**: ${rps[mao]}!\n` +
					( result === 0 ? 'DRAW' : ( result === 1 ? 'You lose 😭' : '**You WON! 😎**' ) )
				)
			},
		})
	}
}