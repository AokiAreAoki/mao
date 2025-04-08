// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		function destructureArgs( args ){
			return {
				args,
				args_toString: args.toString(),
				otherArgsProperties: {
					negativeLength: args.negativeLength,
					pos: args.pos,
					string: args.string,
					flags: Object.fromEntries( Object
						.entries( args.flags )
						.map( ([ key, value ]) => [key, destructureFlag( value )] )
					),
				},
			}
		}

		function destructureFlag( flag ){
			return {
				flag,
				otherFlagProperties: {
					class: flag.class,
					specified: flag.specified,
				},
			}
		}

		addCommand({
			aliases: 'arg-tester args',
			description: 'test command arguments',
			flags: [
				['flag1', 'flag with no args'],
				['flag2', '<arg>', 'flag with one arg - $1'],
				['flag3', '<arg1>', '<arg2>', 'flag with two args - $1 $2'],
			],
			async callback({ args, session }){
				const structure = JSON.stringify( destructureArgs( args ), null, 2 )

				return session.update({
					content: structure,
					cb: true,
				})
			},
		})
	}
}