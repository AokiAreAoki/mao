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
		
		let mention = /^(mao|мао)([~_\-\s]((ch|s)an|чан|сан|тян))?~?[!.]?$/i
		
		client.on( 'ready', () => {
			mention = new RegExp( `^(mao|мао|<@!?${client.user.id}>)([~_\\-\\s]((ch|s)an|чан|сан|тян))?~?[!.]?$`, 'i' )
		})
		
		addMessageHandler( msg => {
			if( mention.test( msg.content ) )
				msg.send( getRandomResponse( msg.member ) + ( msg.content.matchFirst( /(~?[!.]?)$/ ) || '' ) )
		})
	}
}