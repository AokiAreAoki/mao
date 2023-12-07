// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const CM = require( '@/instances/command-manager' )
		const Embed = require( '@/functions/Embed' )
		const cb = require( '@/functions/cb' )
		const { flags } = require( '@/index' )

		const help = addCommand({
			aliases: 'help h',
			description: {
				short: '-help help for help',
				full: 'Displays information about commands and modules',
				usages: [
					['sends a list of all modules and commands'],
					['<command>', 'sends full description of `<commands>`'],
					['<module>', 'sends list of commands of `<module>` with short descriptions'],
				],
				examples: [
					['sends a list of all modules and commands'],
					['help', 'sends this message'],
					['mao', 'sends list of commands of `Mao` module with short descriptions'],
				],
			},
			callback({ msg, args, session }){
				if( args[0] ){
					const command = CM.findCommand( args.getRaw() )

					if( command )
						return session.update( command.help )

					const module = CM.modules.get( args[0].toLowerCase() )

					if( module && module.isAccessibleFor( msg.author ) )
						//return session.update( `${module.printname}:${cb( module.listCommands(), 'asciidoc' )}` )
						return session.update( cb( `== ${module.printname} ==\n${module.listCommands()}`, 'asciidoc' ) )

					return session.update( `No module or command named \`${args[0]}\` has been found.` )
				}

				const emb = Embed().setDescription([
					`Prefix: \`${CM.prefix}\``,
					`Flag prefix: \`${CM.constructor.ArgumentParser.flagPrefix}\``,
					`For more information use \`help <command/module>\``,
				].join( '\n' ) )

				CM.modules.forEach( module => {
					if( module.commands.length !== 0 && !module.isHidden ){
						const commands = module.commands
							.map( command => {
								let string = `\`${command.name}\``

								if( command.subcommands.length !== 0 )
									string += `(${command.subcommands.length})`

								return string
							})
							.join( ', ' )

						emb.addFields({ name: module.printname, value: commands })
					}
				})

				session.update( emb )
			},
		})

		// Sub-commands tester
		if( !flags.dev )
			return

		const description = 'test command'
		const callback = ({ args, session }) => {
			session.update([
				'```',
				'    -3 :: ' + args[-3],
				'    -2 :: ' + args[-2],
				'    -1 :: ' + args[-1],
				args.map( ( v, k ) => `${' '.repeat( 6 - k.toString().length )}${k} :: ${v}` ).join( '\n' ),
				'string :: ' + args.getRaw(),
				'```',
			].join( '\n' ) )
		}

		const sub1 = help.addSubcommand({
			aliases: 'sub-command1 sc1',
			description,
			callback,
		})

		const sub2 = help.addSubcommand({
			aliases: 'sub-command2 sc2',
			description,
			callback,
		})

		sub1.addSubcommand({
			aliases: 'sub-sub-command1 ssc1',
			description,
			callback,
		})

		sub2.addSubcommand({
			aliases: 'sub-sub-command2 ssc2',
			description,
			callback,
		})
	}
}
