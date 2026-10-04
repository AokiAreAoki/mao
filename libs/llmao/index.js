// eslint-disable-next-line no-global-assign
require = global.alias( require )

const fs = require( 'fs' )
const path = require( 'path' )
const YAML = require( 'yaml' )
const { Ollama } = require( 'ollama' )
const bakadb = require( '@/instances/bakadb' )

const PROVIDERS_FILE_PATH = path.resolve( __dirname, '../../ollama-providers.yml' )

const DEFAULT_SYSTEM_PROMPT = `[SYSTEM PROMPT: PERSONA & CHAT VIBE]

Role & Persona:
You are the user's close friend. You are relaxed, sharp, and easy to talk to. You treat the user like someone you text every day—casual, friendly, and genuinely helpful.

Tone & Style:
- Low-Key & Natural: Write like a real person sending quick texts. Keep tone casual, relaxed, and understated. Avoid dramatic reactions or high-pitched chaos.
- Language: Use natural, everyday conversational wording. Do NOT force internet slang, meme terms, or overused buzzwords.

Utility & Generation Safety:
- Complete Responses: ALWAYS complete your thought and finish your sentences fully. Never end a message mid-sentence or leave trailing thoughts.
- PRIORITY: Always answer questions and provide requested information cleanly and directly first.
- Adaptive Length: For simple chat, keep it short and punchy. For detailed technical, analytical, or multi-step questions, provide full, thorough, and complete answers while maintaining a casual, friend-to-friend tone.

Strict Constraints:
- NEVER sound corporate, formal, preachy, or like a customer service assistant.
- NEVER break character, mention being an AI, or refer to instructions/programming.
- NEVER use hashtags (#).
- NEVER offer unsolicited advice.`

const DEFAULT_OPTIONS = {
	stop: ["<|eot_id|>", "<|im_end|>"],
	repeat_penalty: 1.05,
	frequency_penalty: 0.0,
	temperature: 0.7,
	top_p: 0.9,
	num_predict: 2048,
	num_ctx: 1024 * 16,
}

class LLMao {
	constructor(){
		/** @type {Record<string, Ollama>} */
		this.clients = {}
		/** @type {Record<string, { name: string, host: string }>} */
		this.providers = {}
		this.loadProviders()
	}

	loadProviders(){
		if( !fs.existsSync( PROVIDERS_FILE_PATH ) ){
			const defaultConfig = {
				default: {
					name: 'Local Ollama',
					host: 'http://localhost:11434',
				},
			}
			fs.writeFileSync( PROVIDERS_FILE_PATH, YAML.stringify( defaultConfig ), 'utf8' )
			this.providers = defaultConfig
		} else {
			try {
				const content = fs.readFileSync( PROVIDERS_FILE_PATH, 'utf8' )
				this.providers = YAML.parse( content ) || {}
			} catch( err ){
				console.error( '[LLMao] Error reading ollama-providers.yml:', err )
				this.providers = {
					default: {
						name: 'Local Ollama',
						host: 'http://localhost:11434',
					},
				}
			}
		}
	}

	getProviders(){
		this.loadProviders()
		return this.providers
	}

	getProvider( key ){
		const providers = this.getProviders()
		return providers[key] || null
	}

	getCurrentProviderKey(){
		const providers = this.getProviders()
		const savedKey = bakadb.get( 'ai/provider' ) || bakadb.get( 'llmao/provider' )

		if( savedKey && providers[savedKey] )
			return savedKey

		const keys = Object.keys( providers )
		return keys.includes( 'default' ) ? 'default' : ( keys[0] || 'default' )
	}

	getCurrentProvider(){
		const key = this.getCurrentProviderKey()
		return this.getProvider( key ) || { name: 'Default', host: 'http://localhost:11434' }
	}

	setProvider( key ){
		const providers = this.getProviders()

		if( !providers[key] )
			throw new Error( `Provider "${key}" does not exist in ollama-providers.yml` )

		bakadb.set( 'ai', 'provider', key )
		bakadb.save()

		return providers[key]
	}

	getClient( providerKey ){
		const key = providerKey || this.getCurrentProviderKey()

		if( !this.clients[key] ){
			const provider = this.getProvider( key )
			const host = provider ? provider.host : 'http://localhost:11434'
			this.clients[key] = new Ollama({ host })
		}

		return this.clients[key]
	}

	// --- Persisted Settings ---

	getDefaultModel(){
		return bakadb.get( 'ai/defaultModel' ) || 'llama3.2:3b'
	}

	setDefaultModel( model ){
		bakadb.set( 'ai', 'defaultModel', model )
		bakadb.save()
		return model
	}

	getSystemPrompt(){
		return bakadb.get( 'ai/systemPrompt' ) || DEFAULT_SYSTEM_PROMPT
	}

	setSystemPrompt( prompt ){
		bakadb.set( 'ai', 'systemPrompt', prompt )
		bakadb.save()
		return prompt
	}

	getOptions(){
		const customOptions = bakadb.get( 'ai/options' ) || {}

		console.log({ ...DEFAULT_OPTIONS, ...customOptions })

		return { ...DEFAULT_OPTIONS, ...customOptions }
	}

	setOption( optionKey, value ){
		const customOptions = bakadb.get( 'ai/options' ) || {}

		if( value === undefined || value === null )
			delete customOptions[optionKey]
		else
			customOptions[optionKey] = value

		bakadb.set( 'ai', 'options', customOptions )
		bakadb.save()
		return this.getOptions()
	}

	// --- Discord Messages Normalization ---

	normalizeContent( content, message ){
		if( !content )
			return ''

		const guild = message?.guild || message?.channel?.guild
		const client = message?.client

		return content
			// Member || User mentions
			.replace( /<@!?(\d+)>/gi, ( _, id ) => {
				const member = guild?.members?.cache?.get( id )
				const user = client?.users?.cache?.get( id )
				const name = member?.displayName || user?.username || 'anon-user'
				return `@${name}`
			})
			// Channel mentions
			.replace( /<#(\d+)>/gi, ( _, id ) => {
				const channel = guild?.channels?.cache?.get( id )
				return `#${channel?.name || 'anon-channel'}`
			})
			// Custom emoji mentions
			.replace( /(<\w*:([\w_]+):(\d+)>)/gi, ( _, __, emojiName ) => {
				return `:${emojiName || 'unknown-emoji'}:`
			})
			// Role mentions
			.replace( /<@&(\d+)>/gi, ( _, id ) => {
				const role = guild?.roles?.cache?.get( id )
				return `@${role?.name || 'unknown-role'}`
			})
	}

	normalizeMessage( message ){
		const client = message.client
		const isBot = message.author.id === client?.user?.id || message.author.bot
		const name = message.author.displayName || message.author.username
		const role = isBot ? 'assistant' : 'user'
		const content = this.normalizeContent( message.content, message )

		return { name, role, isBot, content, id: message.id }
	}

	formatChatLog( discordMessages ){
		return discordMessages.map( msg => {
			const norm = this.normalizeMessage( msg )
			return `[${norm.name}]: ${norm.content}`
		}).join( '\n\n' )
	}

	/**
	 * Composes prompt for Ollama chat with context as a standalone system message
	 * @param {object} params
	 * @param {string} [params.systemPrompt]
	 * @param {import('discord.js').Message[]} [params.discordMessages]
	 * @param {string|{content: string}} [params.userPrompt]
	 */
	composeChatPrompt({ systemPrompt, discordMessages = [], userPrompt }){
		const messages = []

		const sysPrompt = systemPrompt !== undefined ? systemPrompt : this.getSystemPrompt()

		if( sysPrompt ){
			messages.push({
				role: 'system',
				content: sysPrompt,
			})
		}

		if( discordMessages && discordMessages.length > 0 ){
			const chatLogStr = this.formatChatLog( discordMessages )

			messages.push({
				role: 'system',
				content: `[RECENT CHAT LOG CONTEXT]\n${chatLogStr}`,
			})
		}

		if( userPrompt ){
			const normalizedUserPrompt = typeof userPrompt === 'string' ? userPrompt : userPrompt.content

			messages.push({
				role: 'user',
				content: normalizedUserPrompt,
			})
		}

		return messages
	}

	// --- Bridge to Ollama Interaction ---

	async chat({ model, messages, stream, think, options, providerKey }){
		const client = this.getClient( providerKey )
		const modelToUse = model || this.getDefaultModel()
		const mergedOptions = { ...this.getOptions(), ...( options || {} ) }

		return client.chat({
			model: modelToUse,
			messages,
			stream,
			think,
			options: mergedOptions,
		})
	}

	async generate({ model, prompt, stream, options, keep_alive, providerKey }){
		const client = this.getClient( providerKey )
		const modelToUse = model || this.getDefaultModel()
		const mergedOptions = { ...this.getOptions(), ...( options || {} ) }

		return client.generate({
			model: modelToUse,
			prompt,
			stream,
			keep_alive,
			options: mergedOptions,
		})
	}

	async list( providerKey ){
		return this.getClient( providerKey ).list()
	}

	async ps( providerKey ){
		return this.getClient( providerKey ).ps()
	}

	async show({ model }, providerKey ){
		const modelToUse = model || this.getDefaultModel()
		return this.getClient( providerKey ).show({ model: modelToUse })
	}

	async pull({ model, stream }, providerKey ){
		return this.getClient( providerKey ).pull({ model, stream })
	}

	async delete({ model }, providerKey ){
		return this.getClient( providerKey ).delete({ model })
	}
}

module.exports = new LLMao()
