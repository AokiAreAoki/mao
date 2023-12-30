// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )

		const MAX = 50
		const messageDisplayTime = 3e3
		const isIDLike = string => /^\d+$/.test( string )

		addCommand({
			aliases: 'clear clean purge',
			flags: [
				['before', '<message ID>', 'deletes messages posted before a message of $1'],
				['after', '<message ID>', 'deletes messages posted after a message of $1'],
			],
			description: {
				single: 'deletes messages',
				usages: [
					[`<number>`, `deletes $1 last messages (max. ${MAX})`],
					[`<number>`, '[@@]', `deletes $1 messages that belong to @@ (max. ${MAX}; fetches only last 100 messages)`],
				],
			},
			callback: async ({ msg, args, session }) => {
				const amount = args[0] ? Math.min( parseInt( args[0] ), MAX ) : 1

				if( isNaN( amount ) || amount <= 0 )
					return session.update( 'You entered invalid number or number is ≤ 0' )

				const fetchOptions = { limit: 100 }
				const { after, before } = args.flags

				if( after.specified && isIDLike( after[0] ) ){
					if( before.specified && isIDLike( before[0] ) )
						return session.update( "You can't use the `after` and the `before` flags together" )

					fetchOptions.after = after[0]
				} else {
					fetchOptions.before = before.specified && isIDLike( before[0] )
						? before[0]
						: msg.id
				}

				msg.isCommand = false
				msg.makeUnpurgable()

				const user = await msg.guild.members.find( args[1] )
				const messages = await msg.channel.messages.fetch( fetchOptions )
					.then( messages => Array.from( messages.values() )
						.filter( m => {
							if( m.unpurgable && m.unpurgable > Date.now() )
								return false

							return !user || m.author.id === user.id
						})
						.slice( 0, amount )
					)
				const actualAmount = amount === messages.length ? amount : `${messages.length}/${amount}`

				if( client.user.bot )
					msg.channel.purge( messages )
				else
					messages.forEach( m => m.delete() )

				const reply = await session.update( `${actualAmount} message${amount !== 1 ? 's have' : ' has'} been deleted` )
				msg.channel.purge( [msg, reply], messageDisplayTime )
			},
		})
	}
}