const printify = require('../../re/printify')

// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { PermissionFlagsBits } = require( 'discord.js' )
		const client = require( '@/instances/client' )

		const MAX = 50
		const messageDisplayTime = 3e3
		const isIDLike = string => /^\d+$/.test( string )

		function resolveID( flag, fallbackMessage ){
			if( flag[0] )
				return isIDLike( flag[0] ) ? flag[0] : null

			return fallbackMessage?.id
		}

		addCommand({
			aliases: 'clear clean purge',
			flags: [
				['before', '[<message ID>]', 'deletes messages posted before a message of $1 or reply referenced message'],
				['after', '[<message ID>]', 'deletes messages posted after a message of $1 or reply referenced message'],
				['user', '<@@>', `deletes messages that belong to @@ only (max. ${MAX}; fetches only last 100 messages)`],
			],
			description: {
				single: 'deletes messages',
				usages: [
					[`<number>`, `deletes $1 last messages (max. ${MAX})`],
				],
			},
			callback: async ({ msg, args, session }) => {
				if( !msg.member.permissions.has( PermissionFlagsBits.ManageMessages, true ) && !msg.author.isMaster() )
					return session.update( 'You do not have permission to manage messages' )

				const amount = args[0] ? Math.min( parseInt( args[0] ), MAX ) : 1

				if( isNaN( amount ) || amount <= 0 )
					return session.update( 'You entered invalid number or number is ≤ 0' )

				const ref = await msg.getReferencedMessage()
				const fetchOptions = { limit: 100 }
				let flag = null

				if( args.flags.after.specified ){
					if( args.flags.before.specified )
						return session.update( "You can't use the `after` and the `before` flags together" )

					flag = args.flags.after
				} else if( args.flags.before.specified ){
					flag = args.flags.before
				} else {
					fetchOptions.before = msg.id
				}

				if( flag ){
					const id = resolveID( flag, ref )

					if( !id )
						return session.update( 'You entered an invalid message ID or did not reply to any message' )

					fetchOptions[flag.class.name] = id
				}

				msg.isCommand = false
				msg.makeUnpurgable()

				if( args.flags.user.specified && !args.flags.user[0] )
					return session.update( 'You have not specified a user' )

				const user = args.flags.user.specified && await msg.guild.members.find( args.flags.user[0] )

				if( args.flags.user.specified && !user )
					return session.update( 'User not found' )

				const messages = await msg.channel.messages.fetch( fetchOptions )
					.then( messages => Array.from( messages.values() ) )
					.then( messages => args.flags.after.specified ? messages.reverse() : messages )
					.then( messages => messages
						.filter( message => {
							if( message.unpurgable && message.unpurgable > Date.now() )
								return false

							if( user )
								return message.author.id === user.id

							return true
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
