module.exports = {
	requirements: 'db',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'evalall',
			description: {
				short: 'turns evalall on/off',
				full: "Turns `evalall` feature on or off\nIf evalall is on then Mao will try to evaluate everything you type in chat. Be carefull, it's dangerous!",
				usages: [
					['<on/off>', ''],
				],
			},
			callback: ( msg, args ) => {
				let arg = args[0]?.toLowerCase()

				switch( arg ){
					case 'on':
					case 'off':
						if( !db.evalall )
							db.evalall = new List()
						
						if( arg === 'on' )
							db.evalall[msg.author.id] = true
						else
							delete db.evalall[msg.author.id]
							
						msg.send( `You've turned evalall feature ${arg}` )
						break

					default:
						msg.send( "Usage: `-evalall <on/off>`" )
				}
			},
		})
	}
}