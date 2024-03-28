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
			const response = responses[Math.floor( Math.random() * responses.length )]

			if( response instanceof discord.Emoji )
				return response.toString()

			return response
				.replace( /\((.+?)\)\?/g, ( _, s ) => Math.random() < 0.5 ? s : '' )
				.replace( /\((.+?)\|(.+?)\)/g, ( _, a, b ) => Math.random() < 0.5 ? a : b )
				.replace( /%user/gi, member.displayName.replace( /@/g, '#' ) )
		}

		const guildCoolDowns = new WeakMap()
		const userCoolDowns = new WeakMap()

		client.once( discord.Events.ClientReady, () => {
			triggers.push({
				regexp: new RegExp( `^(?:mao|мао|<@!?(${client.user.id})>)`, 'i' ),
				callback: mentionTrigger,
			})

			emojis.forEach( id => {
				const emoji = client.emojis.resolve( id )

				if( emoji )
					responses.push( emoji )
			})
		})

		/**
		 * @callback TriggerCallback
		 * @param {discord.Message} msg
		 * @param {import('@/re/message-manager/response')} session
		 * @param {RegExpMatchArray} match
		 * @returns {Promise<void>}
		 */

		/**
		 * @typedef {Object} Trigger
		 * @property {RegExp} regexp
		 * @property {TriggerCallback} callback
		 */

		/** @type {Trigger[]} */
		const triggers = [
			{
				regexp: /m[re]+o+w+~*/i,
				callback({ msg, session, match }) {
					const cd = guildCoolDowns.get( msg.guild )

					if( cd && cd > Date.now() )
						return

					guildCoolDowns.set( msg.guild, Date.now() + 30e3 )
					return session.update( match, { reply: false } )
				},
			},
			{
				regexp: /(thanks?|thx)\s+([you]+\s+)?mao/i,
				callback: ({ session }) => session.update( 'no problem', { reply: false } ),
			},
			{
				regexp: /^(who|hu)\??$/i,
				callback({ msg, session }) {
					const cd = userCoolDowns.get( msg.author )

					if( cd && cd > Date.now() )
						return

					userCoolDowns.set( msg.author, Date.now() + 30e3 )
					return session.update( Math.random() < .75 ? 'tao' : 'tao, yeah', { reply: false } )
				},
			},
		]

		/** @type {TriggerCallback} */
		const mentionTrigger = ({ msg, session, match }) => {
			if( match === client.user.id )
				return session.update( msg.author.toString(), { reply: false } )

			const text = msg.content.substr( match.length )

			if( /^('?s|\s*is)?\s*((stupid|shit|dumb)\s*bot|baka|бака|дура|дурында|тупая|глупая)\s*~?[!.]?/i.test( text ) )
				return session.update( 'no u', { reply: false } )

			let postfix = text.matchFirst( /\W*$/i ) ?? ''

			if( postfix.length > 10 )
				postfix = ''

			const response = postfix
				? msg.member.displayName.replace( /@/g, '#' ) + postfix
				: getRandomResponse( msg.member )

			return session.update( response, { reply: false } )
		}

		MM.pushHandler( 'message-triggers', false, msg => {
			if( msg.author.id == client.user.id || msg.author.bot )
				return

			const session = msg.response.session

			for( const trigger of triggers ){
				const match = msg.content.matchFirst( trigger.regexp )

				if( match )
					return trigger.callback({ msg, session, match })
			}
		})
	}
}
