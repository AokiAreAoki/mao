module.exports = {
	requirements: 'MM',
	init: ( requirements, mao ) => {
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
		
		let mention, // = /^(mao|мао)([~_\-\s]((ch|s)an|чан|сан|тян))?~?[!.]?$/i,
			insult   // = /^(mao|мао)([~_\-\s]((ch|s)an|чан|сан|тян))?~?\s*((stupid|shit)\s+bot|baka|бака|дура|дурында)\s*~?[!.]?$/i
		
		client.on( 'ready', () => {
			mention = new RegExp( `^(?:mao|мао|<@!?${client.user.id}>)(?:[~_-\\s](?:(?:ch|s)an|чан|сан|тян))?([.?!~]*)$`, 'i' )
			insult  = new RegExp( `^(mao|мао|<@!?${client.user.id}>)([~_-\\s]((ch|s)an|чан|сан|тян))?\\s*((stupid|shit)\\s+bot|baka|бака|дура|дурында)\\s*[.?!~]*$`, 'i' )
		})
		
		MM.pushHandler( 'mention_response', false, msg => {
			if( msg.author.id == client.user.id || msg.author.bot ) return
			
			let match = msg.content.match( mention )

			if( match )
				msg.send( getRandomResponse( msg.member ) + ( match[1] || '' ) )
			else if( insult.test( msg.content ) )
				msg.reply( 'no u' )
		})
	}
}