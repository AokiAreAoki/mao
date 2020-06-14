module.exports = {
	requirements: 'addMessageHandler',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		let responses = [
			'USER',
			'Hi, USER',
			'Hi, cutie',
		]
		
		function getRandomResponse( member ){
			let r = Math.floor( Math.random() * responses.length )
			return responses[r].replace( /USER/, member.displayName )
		}
		
		let mention = /^(mao|мао)([~_\-\s]((ch|s)an|чан|сан|тян))?~?[!.]?$/i,
			insult  = /^(mao|мао)([~_\-\s]((ch|s)an|чан|сан|тян))?~?\s*((stupid|shit)\s+bot|baka|бака|дура)\s*~?[!.]?$/i
		
		client.on( 'ready', () => {
			mention = new RegExp( `^(mao|мао|<@!?${client.user.id}>)([~_\\-\\s]((ch|s)an|чан|сан|тян))?~?[!.]?$`, 'i' )
			insult  = new RegExp( `^(mao|мао|<@!?${client.user.id}>)([~_\\-\\s]((ch|s)an|чан|сан|тян))?~?\\s*((stupid|shit)\\s+bot|baka|бака|дура)\\s*~?[!.]?$`, 'i' )
		})
		
		addMessageHandler( 'mention response', msg => {
			if( msg.author.id == client.user.id || msg.author.bot ) return
			
			if( insult.test( msg.content ) )
				msg.reply( 'no u' )

			if( mention.test( msg.content ) )
				msg.send( getRandomResponse( msg.member ) + ( msg.content.matchFirst( /(~?[!.]?)$/ ) || '' ) )
		})
	}
}