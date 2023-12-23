// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const bakadb = require( '@/instances/bakadb' )
		const List = require( '@/re/list' )

		addCommand({
			aliases: 'evalall',
			description: {
				short: 'turns evalall on/off',
				full: "Turns `evalall` feature on or off\nIf evalall is on then Mao will try to evaluate everything you type in chat. Be careful, it's dangerous!",
				usages: [
					['<on/off>', ''],
				],
			},
			callback: ({ msg, args, session }) => {
				const arg = args[0]?.toLowerCase()

				const evalall = bakadb.fallback({
					path: 'evalall',
					defaultValue: () => new List(),
				})

				switch( arg ){
					case 'on':
					case 'off':
						if( arg === 'on' ){
							evalall.add( msg.author.id )
						} else {
							evalall.remove( msg.author.id )
						}

						session.update( `You've turned \`evalall\` feature ${arg}` )
						break

					default: {
						const status = evalall[msg.author.id] ? 'on' : 'off'

						session.update([
							`Your \`evalall\` is turned \`${status}\``,
							"Usage: `-evalall <on/off>`",
						].join( '\n' ))
					}
				}
			},
		})
	}
}