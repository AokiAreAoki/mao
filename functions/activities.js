module.exports = {
	requirements: 'client timer db',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		let nextgame = 0,
			gameinterval = 300e3,
			gameid = 0,
			gametext = '',
			games = [
				{ // <= startup game
					type: 'PLAYING',
					game: 'wakes up~',
				},
				{
					type: 'PLAYING',
					game: () => db.totaluptime ? `for ${ Math.floor( db.totaluptime / 60 ) }h` : 'bruh',
				},
				{
					type: 'PLAYING',
					game: () => msgrate.length + ' mpm',
				},
				{
					type: 'WATCHING',
					game: () => { nextgame = Math.min( nextgame, Date.now() + 228 ); return 'Send nudes' }
				},
			]

		var msgrate = []
		
		client.on( 'message', msg => { if( !msg.member.bot ) msgrate.push( Date.now() ) } )
		setInterval( () => { while( msgrate[0] < Date.now() ) msgrate.shift() }, 1337 )
		
		function updateActivity(){
			if( nextgame < Date.now() ){
				nextgame = Date.now() + gameinterval
				gameid = gameid % ( games.length - 1 ) + 1
			}
			
			let game = games[gameid]
			let text = String( typeof game.game == 'function' ? game.game() : game.game )
			
			if( gametext != text ){
				gametext = text
				client.user.setActivity( text, { type: game.type } )
			}
		}

		client.once( 'ready2', () => {
			client.on( 'ready', () => {
				gameid = 0
				gametext = ''
				nextgame = Date.now() + 15e3
				updateActivity()
			})
			
			nextgame = Date.now() + 15e3
			timer.create( 'activities', 1.337, 0, updateActivity )
			updateActivity()
		})
	}
}