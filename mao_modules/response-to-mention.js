// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init(){
		const client = require( '@/instances/client' )
		const MM = require( '@/instances/message-manager' )
		const discord = require( 'discord.js' )

		const responses = [
			`%user`,
			`(yes|no)`,
			`(Hi|Yes), (%user|cutie)~`,
			`who`,
			`no u`,
			`nya(~)?`,
			`kys`,
			`?`,
		]

		const emojis = [
			'928644275145691186',
		]

		function getRandomResponse( member ){
			const r = Math.floor( Math.random() * responses.length )

			if( responses[r] instanceof discord.Emoji )
				return responses[r].toString()

			return responses[r]
				.replace( /\((.+?)\)\?/g, ( matched, s ) => Math.random() < 0.5 ? s : '' )
				.replace( /\((.+?)\|(.+?)\)/g, ( matched, a, b ) => Math.random() < 0.5 ? a : b )
				.replace( /%user/gi, member.displayName.replace( /@/g, '#' ) )
		}

		let mentionRE = /^(mao|мао)/i
		// = /^(mao|мао)([~_\-\s]((ch|s)an|чан|сан|тян))?~?\s*((stupid|shit)\s+bot|baka|бака|дура|дурында)\s*~?[!.]?$/i

		client.on( discord.Events.ClientReady, () => {
			mentionRE = new RegExp( `^(?:mao|мао|<@!?(${client.user.id})>)`, 'i' )

			emojis.forEach( id => {
				const emoji = client.emojis.resolve( id )

				if( emoji )
					responses.push( emoji )
			})
		})

		MM.pushHandler( 'mention_response', false, msg => {
			if( msg.author.id == client.user.id || msg.author.bot )
				return

			const session = msg.response.session

			if( msg.content.matchFirst( /(thanks?|thx)\s+([you]+\s+)?mao/i ) )
				return session.update( 'no problem', 0 )

			if( msg.content.matchFirst( /^(who|hu)\??$/i ) ){
				if( msg.author.huCD && msg.author.huCD > Date.now() )
					return

				msg.author.huCD = Date.now() + 10e3
				const text = Math.random() < .75
					? 'tao'
					: 'tao, yeah'

				return session.update( text, 0 )
			}

			const mention = msg.content.matchFirst( mentionRE )

			if( mention ){
				if( mention === client.user.id )
					return session.update( msg.author.toString(), 0 )

				const text = msg.content.substr( mention.length )

				if( /^('?s|\s*is)?\s*((stupid|shit|dumb)\s*bot|baka|бака|дура|дурында|тупая|глупая)\s*~?[!.]?/i.test( text ) )
					return session.update( 'no u' )

				let postfix = text.matchFirst( /\W*$/i ) ?? ''

				if( postfix.length > 10 )
					postfix = ''

				const response = postfix
					? msg.member.displayName.replace( /@/g, '#' ) + postfix
					: getRandomResponse( msg.member )

				return session.update( response, 0 )
			}
		})
	}
}
