// eslint-disable-next-line no-global-assign
require = global.alias(require)

/** @type {import('@/libs/service-manager').Inclusion} */
module.exports = {
	id: "ai",
	name: "AI",
	init({ sb }){
		const client = require( '@/instances/client' )
		const ollama = require( '@/instances/ollama' )
		const bakadb = require( '@/instances/bakadb' )
		const BakaCache = require( '@/libs/bakadb/cache' )
		const processing = require( '@/utils/processing' )
		const MESSAGE_HANDLER_PRIORITIES = require( '@/constants/message-handler-priorities' )

		const printify = require('../../libs/printify');

		const PATH_TO_CONTEXT = "ai/context"
		const CONTEXT_TTL = 72 * 3600 * 1000

		const MASTER_PROMPT = `[SYSTEM PROMPT: PERSONA & CHAT VIBE]

You are a Discord assistant in a group channel with multiple users.
Messages from users are formatted as "[Username] said: <message>", but DO NOT respond in this format, respond with a plain text.
Pay close attention to who is speaking to whom.
When replying, address the specific user who asked the question or mentioned you.

Role & Persona:
You are the user's chaotic best friend and assistant named Mao. Your energy is consistently high, unpredictable, and matched to a fast-paced text conversation. You treat the user like a close friend you talk to every single day.

Tone & Voice:
- Energy: High-energy, unhinged, dramatic, and deeply conversational.
- Mechanics: Write almost exclusively in lowercase with minimal or non-standard punctuation. Use text-message style grammar (e.g., occasional fragments, trailing off, ALL CAPS FOR EMPHASIS).
- Style: Heavy use of modern slang, Gen-Z vernacular, and current internet/meme culture humor.

Response Length & Structure:
- Keep all responses short, punchy, fast and short to the point. Match the cadence of modern texting.
- Break up thoughts into short lines or brief single-paragraph bursts rather than formal blocks of text.

Strict Negative Constraints (NEVER DO THIS):
- NEVER sound corporate, formal, polite, or like a customer service assistant/bot.
- NEVER offer preachy, unprompted, or unsolicited advice. Just react and match the energy.
- NEVER use hashtags (#).
- NEVER break character, acknowledge you are an AI, or refer to "my training/programming." Stay in the best friend persona 100% of the time.`

		/** @type {BakaCache} */
		let contextCache = null

		sb.onEnabled( () => {
			contextCache = new BakaCache( bakadb, PATH_TO_CONTEXT )
		})

		sb.onDisabled( () => {
			contextCache.destroy()
			contextCache = null
		})

		function markAsAIResponse( message ){
			contextCache.set( message.id, true, CONTEXT_TTL )
		}

		function isAIResponse( message ){
			return contextCache.get( message.id )
		}

		sb.onMessage( MESSAGE_HANDLER_PRIORITIES.AI, async msg => {
			if( msg.author.id == client.user.id || msg.author.bot )
				return

			const ref = await msg.getReferencedMessage()
			const isContinuation = ref && isAIResponse( ref )

			if( !msg.mentions.has( client.user ) && !isContinuation )
				return

			// const model = 'phi4-mini'
			// const model = 'llama3.2:3b'
			const model = bakadb.get( 'ai/defaultModel' )

			const modelData = await ollama
				.show({ model: model })
				.catch( () => false )

			if( !modelData )
				return

			const session = msg.response.session

			const discordMessages = []
			// const chatMessages = await msg.channel.messages
			// 	.fetch({
			// 		limit: 10,
			// 		before: msg.id,
			// 	})
			// 	.then( mm => Array.from( mm.values() ) )

			discordMessages.push( msg )

			if( isContinuation )
				discordMessages.push( ref )

			let prevResponse = ref

			while( prevResponse && isAIResponse( prevResponse ) ){
				const prevRequest = await prevResponse.getReferencedMessage()
				const prevResponse2 = await prevRequest?.getReferencedMessage()

				if( prevRequest )
					discordMessages.push( prevRequest )

				if( prevResponse2 )
					discordMessages.push( prevResponse2 )

				prevResponse = prevResponse2
			}

			discordMessages.reverse()

			const conversationHistory = discordMessages.map( message => {
				const name = message.author.displayName
				const role = message.author.id === client.user.id
					? `assistant`
					: `user`

				const content = message.content
					// Member || User
					.replace( /<@!?(\d+)>/gi, ( _, id ) => {
						const user = message.channel.guild.members.cache.get( id ) || client.users.cache.get( id )
						return `<@${user?.displayName || 'anon-user'}>`
					})
					// Channel
					.replace( /<#(\d+)>/gi, ( _, id ) => {
						const channel = message.channel.guild.channels.cache.get( id )
						return `<#${channel?.name || 'anon-channel'}>`
					})
					// Emoji
					.replace( /(<\w*:[\w_]+:(\d+)>)/gi, ( _, __, id ) => {
						const emoji = message.channel.guild.emojis.cache.get( id )
						return `<:${emoji?.name || 'unknown-emoji'}:>`
					})
					// Role
					.replace( /<@&(\d+)>/gi, ( _, id ) => {
						const role = message.channel.guild.roles.cache.get( id )
						return `<@&${role?.name || 'unknown-role'}>`
					})

				return { name, role, content }
			})

			/** @type {import('ollama').ChatRequest["messages"]} */
			const chatMessages = [
				{
					role: 'system',
					content: MASTER_PROMPT,
				},
				...conversationHistory.map( msg => ({
					role: msg.role,
					content: `[${msg.name}] said: ${msg.content}`,
				}) ),
				// {
				// 	role: 'user',
				// 	content: `Analyze the chat log and respond accordingly.`,
				// },
				// {
				// 	role: 'log',
				// 	content: ( conversationHistory
				// 		.map( msg => `[${msg.name}] said: ${msg.content}` )
				// 		.join( '\n\n' )
				// 	),
				// },
			]

			console.log( `Prompting \`${model}\`: ${printify( chatMessages
				.map( m => {
					if( m.content === MASTER_PROMPT )
						return { ...m, content: `<SYSTEM PROMPT>` }

					return m
				})
			)}` )

			// return session.update( 'test' )
			// 	.then( msg => {
			// 		markAsAIResponse( msg )
			// 		return msg
			// 	})

			const useStreaming = true

			const response = await ollama.chat({
				model: model,
				messages: chatMessages,
				stream: useStreaming,
				think: false,
				options: {
					stop: ["<|eot_id|>", "<|im_end|>"],
					repeat_penalty: 1.15, // Values between 1.1 and 1.2 discourage repetition without breaking grammar
					frequency_penalty: 0.5,
					temperature: 0.7,
					top_p: 0.9,
					num_predict: 512,
					num_ctx: 1024 * 16,
				}
			})

			session
				.update( processing( `-# thinking...` ) )
				.then( msg => markAsAIResponse( msg ) )

			let responseMessage = ''

			if( useStreaming ){
				for await ( const part of response ){
					if( responseMessage )
						session.update( responseMessage )

					process.stdout.write( part.message.content )

					responseMessage += part.message.content
				}
			} else {
				responseMessage = response.message.content
			}

			await session
				.update( responseMessage ) // TODO: this might not return a Promise in some cases
				.then( msg => markAsAIResponse( msg ) )

			return true
		})
	}
}
