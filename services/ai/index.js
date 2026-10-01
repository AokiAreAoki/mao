// eslint-disable-next-line no-global-assign
require = global.alias( require )

/** @type {import('@/libs/service-manager').Inclusion} */
module.exports = {
	id: 'ai',
	name: 'AI',
	init({ sb }){
		const client = require( '@/instances/client' )
		const bakadb = require( '@/instances/bakadb' )
		const LLMao = require( '@/libs/llmao' )
		const BakaCache = require( '@/libs/bakadb/cache' )
		const processing = require( '@/utils/processing' )
		const MESSAGE_HANDLER_PRIORITIES = require( '@/constants/message-handler-priorities' )
		const {
			THINKING_MESSAGE_OPTIONS,
			RESPONDING_MESSAGE_OPTIONS,
		} = require( '@/constants/ai' )

		const PATH_TO_CONTEXT = 'ai/context'
		const CONTEXT_TTL = 72 * 3600 * 1000

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
			if( message && message.id && contextCache )
				contextCache.set( message.id, true, CONTEXT_TTL )
		}

		function isAIResponse( message ){
			return contextCache ? contextCache.get( message.id ) : false
		}

		sb.onMessage( MESSAGE_HANDLER_PRIORITIES.AI, async msg => {
			if( msg.author.id === client.user.id || msg.author.bot )
				return

			const ref = await msg.getReferencedMessage()
			const isContinuation = ref && isAIResponse( ref )
			const isExactBotMention = msg.mentions.has( client.user )

			// Triggers on an exact bot mention or continuation reply chain
			if( !isExactBotMention && !isContinuation )
				return

			const model = LLMao.getDefaultModel()
			const modelData = await LLMao.show({ model }).catch( () => false )

			if( !modelData )
				return

			const session = msg.response.session
			const discordMessages = []

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

			// Prompt composition from system prompt and chat log context via LLMao
			const chatMessages = LLMao.composeChatPrompt({
				systemPrompt: LLMao.getSystemPrompt(),
				discordMessages,
				userPrompt: msg.content,
			})

			const response = await LLMao.chat({
				model,
				messages: chatMessages,
				stream: true,
				think: 'low',
			})

			session
				.update( processing( `-# thinking...` ) )
				.then( initialMsg => markAsAIResponse( initialMsg ) )

			let responseText = ''
			let thinkingText = ''
			let lastUpdatePromise = null

			for await ( const part of response ){
				if( part.message.content ){
					responseText += part.message.content
					process.stdout.write( part.message.content )
				}

				if( part.message.thinking )
					thinkingText += part.message.thinking

				if( responseText )
					lastUpdatePromise = session.update( responseText, RESPONDING_MESSAGE_OPTIONS )
				// else if( thinkingText )
				// 	lastUpdatePromise = session.update( thinkingText, THINKING_MESSAGE_OPTIONS )
			}

			const finalMsg = await ( lastUpdatePromise || session.update( responseText || 'No response received.' ) )
			markAsAIResponse( finalMsg )

			return true
		})
	},
}
