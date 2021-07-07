module.exports = {
	requirements: 'MM',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		const responses = [
			`%user`,
			//`(Hi|Yes), (%user|cutie)`,
			//`no u`,
		]
		
		function getRandomResponse( member ){
			let r = Math.floor( Math.random() * responses.length )
			return responses[r]
				.replace( /\((.+?)\|(.+?)\)/g, ( matched, a, b ) => Math.random() < 0.5 ? a : b )
				.replace( /%user/gi, member.displayName.replace( /@/g, '#' ) )
		}
		
		let mentionRE = /^(mao|мао)/i
		// = /^(mao|мао)([~_\-\s]((ch|s)an|чан|сан|тян))?~?\s*((stupid|shit)\s+bot|baka|бака|дура|дурында)\s*~?[!.]?$/i
		
		client.on( 'ready', () => {
			mentionRE = new RegExp( `^(mao|мао|<@!?${client.user.id}>)`, 'i' )
		})
		
		MM.pushHandler( 'mention_response', false, msg => {
			if( msg.author.id == client.user.id || msg.author.bot )
				return
			
			const mention = msg.content.matchFirst( mentionRE )

			if( mention ){
				const text = msg.content.substr( mention.length )

				if( /^('?s|\s*is)?\s*((stupid|shit|dumb)\s*bot|baka|бака|дура|дурында|тупая|глупая)\s*~?[!.]?/i.test( text ) )
					return msg.reply( 'no u' )

				let postfix = text.matchFirst( /\W*$/i ) ?? ''

				if( postfix.length > 10 )
					postfix = ''
					
				msg.send( getRandomResponse( msg.member ) + postfix )
			}
		})
	}
}