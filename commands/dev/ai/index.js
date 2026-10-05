// eslint-disable-next-line no-global-assign
require = global.alias( require )

module.exports = {
	init({ addCommand }){
		const LLMao = require( '@/libs/llmao' )
		const Embed = require( '@/utils/Embed' )
		const processing = require( '@/utils/processing' )
		const formatBytes = require( '@/utils/formatBytes' )
		const {
			THINK_LEVELS,
			THINKING_MESSAGE_OPTIONS,
			RESPONDING_MESSAGE_OPTIONS,
		} = require( '@/constants/ai' )

		function parseThink( val ){
			if( !val )
				return undefined

			val = val.toLowerCase()

			if( val === 'true' || val === '1' )
				return true

			if( val === 'false' || val === '0' )
				return false

			const thinkLevel = THINK_LEVELS.find( lvl => lvl.startsWith( val ) )

			return thinkLevel
		}

		const root = addCommand({
			aliases: 'ai',
			description: 'AI helper commands powered by LLMao & Ollama',
		})

		// --- CHAT COMMAND (NO SYSTEM PROMPT) ---
		root.addSubcommand({
			aliases: 'chat',
			description: {
				single: 'chats with AI model with no system prompt and parameter customization',
				usages: [
					['<prompt...>', 'sends prompt to AI model without system prompt'],
				],
			},
			flags: [
				[`model`, `<model_name>`, `model to use for chat`],
				[`think`, `<level>`, `thinking level ('high', 'medium', 'low', true, false)`],
				[`temperature`, `<val>`, `temperature parameter for generation`],
				[`top_p`, `<val>`, `top_p parameter`],
				[`repeat_penalty`, `<val>`, `repeat penalty parameter`],
				[`num_predict`, `<val>`, `max tokens to predict`],
				[`provider`, `<key>`, `ollama provider key to use`],
			],
			async callback({ args, session }){
				const prompt = args.join( ' ' ).trim()

				if( !prompt )
					return session.update( this.help )

				const model = args.flags.model?.specified
					? args.flags.model[0]
					: LLMao.getDefaultModel()

				const providerKey = args.flags.provider?.specified
					? args.flags.provider[0]
					: undefined

				const think = args.flags.think?.specified
					? parseThink( args.flags.think[0] )
					: undefined

				const customOptions = {}

				if( args.flags.temperature?.specified ){
					const temp = parseFloat( args.flags.temperature[0] )
					if( !isNaN( temp ) )
						customOptions.temperature = temp
				}

				if( args.flags.top_p?.specified ){
					const topP = parseFloat( args.flags.top_p[0] )
					if( !isNaN( topP ) )
						customOptions.top_p = topP
				}

				if( args.flags.repeat_penalty?.specified ){
					const rp = parseFloat( args.flags.repeat_penalty[0] )
					if( !isNaN( rp ) )
						customOptions.repeat_penalty = rp
				}

				if( args.flags.num_predict?.specified ){
					const np = parseInt( args.flags.num_predict[0] )
					if( !isNaN( np ) )
						customOptions.num_predict = np
				}

				session.update( processing( `-# thinking...` ) )

				try {
					// Notice: Chatting via command uses NO system prompt as requested!
					const response = await LLMao.chat({
						model,
						messages: [{ role: 'user', content: prompt }],
						stream: true,
						think,
						options: customOptions,
						providerKey,
					})

					let responseText = ''
					let thinkingText = ''
					let lastUpdatePromise = null

					for await ( const part of response ){
						if( part.message.content )
							responseText += part.message.content

						if( part.message.thinking )
							thinkingText += part.message.thinking

						if( responseText )
							lastUpdatePromise = session.update( responseText, RESPONDING_MESSAGE_OPTIONS )
						else if( thinkingText )
							lastUpdatePromise = session.update( thinkingText, THINKING_MESSAGE_OPTIONS )
					}

					return responseText
						? lastUpdatePromise
						: session.update( 'No response received.' )
				} catch( error ){
					return session.update( `Error chatting with model \`${model}\`: ${error.message || error}` )
				}
			},
		})

		// --- OLLAMA PROVIDERS COMMAND ---
		const providerCmd = root.addSubcommand({
			aliases: 'provider providers',
			description: 'manages statically defined Ollama providers from ollama-providers.yml',
		})

		providerCmd.addSubcommand({
			aliases: 'list ls',
			description: {
				single: 'lists all statically defined Ollama providers',
				usages: [
					['lists providers from ollama-providers.yml'],
				],
			},
			async callback({ session }){
				const providers = LLMao.getProviders()
				const currentKey = LLMao.getCurrentProviderKey()
				const keys = Object.keys( providers )

				if( keys.length === 0 )
					return session.update( 'No providers defined in `ollama-providers.yml`.' )

				const list = keys.map( key => {
					const p = providers[key]
					const isCurrent = key === currentKey ? ' ⭐ (current)' : ''
					return `• \`${key}\` - **${p.name || key}** (${p.host})${isCurrent}`
				}).join( '\n' )

				return session.update( Embed()
					.setTitle( 'Ollama Providers' )
					.setDescription( list )
				)
			},
		})

		providerCmd.addSubcommand({
			aliases: 'set switch use',
			description: {
				single: 'changes current active Ollama provider',
				usages: [
					['<key>', 'sets active provider to $1'],
				],
			},
			async callback({ args, session }){
				const key = args[0]

				if( !key )
					return session.update( 'Please specify a provider key.' )

				try {
					const provider = LLMao.setProvider( key )
					return session.update( `Switched active Ollama provider to: \`${key}\` (${provider.name || key} - ${provider.host})` )
				} catch( error ){
					return session.update( `Failed to set provider: ${error.message || error}` )
				}
			},
		})

		providerCmd.addSubcommand({
			aliases: 'current info',
			description: {
				single: 'shows info about current active Ollama provider',
				usages: [
					['shows current provider'],
				],
			},
			async callback({ session }){
				const key = LLMao.getCurrentProviderKey()
				const provider = LLMao.getCurrentProvider()

				return session.update( Embed()
					.setTitle( `Current Ollama Provider: ${key}` )
					.addFields(
						{ name: 'Name', value: provider.name || key, inline: true },
						{ name: 'Host', value: provider.host, inline: true },
					)
				)
			},
		})

		// --- LLMAO SETTINGS COMMAND ---
		const settingsCmd = root.addSubcommand({
			aliases: 'settings config cfg',
			description: 'manages LLMao persisted settings and default model parameters',
		})

		settingsCmd.addSubcommand({
			aliases: 'list show info',
			description: {
				single: 'shows current LLMao settings',
				usages: [
					['displays LLMao settings'],
				],
			},
			async callback({ session }){
				const providerKey = LLMao.getCurrentProviderKey()
				const provider = LLMao.getCurrentProvider()
				const defaultModel = LLMao.getDefaultModel()
				const options = LLMao.getOptions()
				const systemPrompt = LLMao.getSystemPrompt()

				const optionsStr = Object.entries( options )
					.map( ([k, v]) => `• \`${k}\`: ${Array.isArray(v) ? JSON.stringify(v) : v}` )
					.join( '\n' )

				const promptPreview = systemPrompt.length > 200
					? systemPrompt.slice( 0, 200 ) + '...'
					: systemPrompt

				const embed = Embed()
					.setTitle( 'LLMao Persisted Settings' )
					.addFields(
						{ name: 'Active Provider', value: `\`${providerKey}\` (${provider.host})`, inline: true },
						{ name: 'Default Model', value: `\`${defaultModel}\``, inline: true },
						{ name: 'Generation Options', value: optionsStr || 'Default' },
						{ name: 'System Prompt', value: '```\n' + promptPreview + '\n```' },
					)

				return session.update( embed )
			},
		})

		settingsCmd.addSubcommand({
			aliases: 'model default-model',
			description: {
				single: 'gets or sets default model',
				usages: [
					['gets default model'],
					['<model>', 'sets default model to $1'],
				],
			},
			async callback({ args, session }){
				const model = args[0]

				if( model ){
					LLMao.setDefaultModel( model )
					return session.update( `Default model set to: \`${model}\`` )
				}

				const current = LLMao.getDefaultModel()
				return session.update( `Current default model: \`${current}\`` )
			},
		})

		settingsCmd.addSubcommand({
			aliases: 'system-prompt system prompt',
			description: {
				single: 'gets or sets master system prompt for chat',
				usages: [
					['gets master system prompt'],
					['<prompt...>', 'sets master system prompt to $1'],
				],
			},
			async callback({ args, session }){
				const prompt = args.join( ' ' ).trim()

				if( prompt ){
					LLMao.setSystemPrompt( prompt )
					return session.update( `Master system prompt updated.` )
				}

				const currentPrompt = LLMao.getSystemPrompt()
				return session.update( Embed()
					.setTitle( 'Master System Prompt' )
					.setDescription( '```\n' + currentPrompt + '\n```' )
				)
			},
		})

		settingsCmd.addSubcommand({
			aliases: 'option opt',
			description: {
				single: 'gets or sets individual generation option in LLMao',
				usages: [
					['<key> <val>', 'sets option parameter (e.g. temperature 0.8)'],
					['<key> reset', 'resets option parameter to default'],
				],
			},
			async callback({ args, session }){
				const key = args[0]
				const valRaw = args[1]

				if( !key )
					return session.update( 'Please specify an option key (e.g. `temperature`, `num_predict`, `repeat_penalty`).' )

				if( valRaw === undefined ){
					const opts = LLMao.getOptions()
					return session.update( `Option \`${key}\`: \`${opts[key]}\`` )
				}

				if( valRaw === 'reset' || valRaw === 'default' ){
					LLMao.setOption( key, undefined )
					return session.update( `Reset option \`${key}\` to default.` )
				}

				let parsedVal = valRaw
				if( !isNaN( Number( valRaw ) ) )
					parsedVal = Number( valRaw )
				else if( valRaw.toLowerCase() === 'true' )
					parsedVal = true
				else if( valRaw.toLowerCase() === 'false' )
					parsedVal = false

				LLMao.setOption( key, parsedVal )
				return session.update( `Updated option \`${key}\` to \`${parsedVal}\`` )
			},
		})

		// --- IN-PROVIDER OLLAMA MANAGEMENT COMMANDS ---
		const ollamaCmd = root.addSubcommand({
			aliases: 'ollama',
			description: 'manages in-provider Ollama models and tasks',
		})

		ollamaCmd.addSubcommand({
			aliases: 'list ls',
			description: {
				single: 'lists available local Ollama models for current provider',
				usages: [
					['lists local models'],
				],
			},
			flags: [
				[`provider`, `<key>`, `provider key`],
			],
			async callback({ args, session }){
				const providerKey = args.flags.provider?.specified ? args.flags.provider[0] : undefined

				try {
					const { models } = await LLMao.list( providerKey )

					if( !models || models.length === 0 )
						return session.update( 'No local models found.' )

					const defaultModel = LLMao.getDefaultModel()

					const list = models.map( m => {
						const isDefault = ( m.name === defaultModel || m.model === defaultModel ) ? ' ⭐ (default)' : ''
						const size = formatBytes( m.size )
						const details = m.details ? ` (${m.details.parameter_size || ''} ${m.details.quantization_level || ''})`.trim() : ''

						return `• \`${m.name}\` - ${size}${details ? ' ' + details : ''}${isDefault}`
					}).join( '\n' )

					const currentP = providerKey || LLMao.getCurrentProviderKey()

					return session.update( Embed()
						.setTitle( `Local Ollama Models (${currentP})` )
						.setDescription( list )
					)
				} catch( error ){
					return session.update( `Failed to list models: ${error.message || error}` )
				}
			},
		})

		ollamaCmd.addSubcommand({
			aliases: 'ps',
			description: {
				single: 'lists currently running Ollama models',
				usages: [
					['lists running models'],
				],
			},
			flags: [
				[`provider`, `<key>`, `provider key`],
			],
			async callback({ args, session }){
				const providerKey = args.flags.provider?.specified ? args.flags.provider[0] : undefined

				try {
					const { models } = await LLMao.ps( providerKey )

					if( !models || models.length === 0 )
						return session.update( 'No models currently running.' )

					const list = models.map( m => {
						const vram = m.size_vram ? ` (VRAM: ${formatBytes( m.size_vram )})` : ''
						const size = formatBytes( m.size )

						return `• \`${m.name}\` - ${size}${vram}`
					}).join( '\n' )

					return session.update( Embed()
						.setTitle( 'Running Ollama Models' )
						.setDescription( list )
					)
				} catch( error ){
					return session.update( `Failed to list running models: ${error.message || error}` )
				}
			},
		})

		ollamaCmd.addSubcommand({
			aliases: 'stop unload',
			description: {
				single: 'unloads a running Ollama model from memory',
				usages: [
					['[<model>]', 'stops/unloads $1 model (unloads all running models if unspecified)'],
				],
			},
			flags: [
				[`provider`, `<key>`, `provider key`],
			],
			async callback({ args, session }){
				const targetModel = args[0]
				const providerKey = args.flags.provider?.specified ? args.flags.provider[0] : undefined

				try {
					const { models } = await LLMao.ps( providerKey )

					if( !models || models.length === 0 )
						return session.update( 'No models currently running.' )

					const modelsToStop = targetModel
						? models.filter( m => m.name === targetModel || m.model === targetModel )
						: models

					if( modelsToStop.length === 0 )
						return session.update( `Model \`${targetModel}\` is not currently running.` )

					await Promise.all( modelsToStop.map( m =>
						LLMao.generate({ model: m.name, keep_alive: 0, providerKey })
					) )

					const stoppedNames = modelsToStop.map( m => `\`${m.name}\`` ).join( ', ' )
					return session.update( `Successfully stopped: ${stoppedNames}` )
				} catch( error ){
					return session.update( `Failed to stop model: ${error.message || error}` )
				}
			},
		})

		ollamaCmd.addSubcommand({
			aliases: 'show info',
			description: {
				single: 'shows detailed info about a model',
				usages: [
					['[<model>]', 'shows details for model (defaults to current default model)'],
				],
			},
			flags: [
				[`provider`, `<key>`, `provider key`],
			],
			async callback({ args, session }){
				const modelName = args[0] || LLMao.getDefaultModel()
				const providerKey = args.flags.provider?.specified ? args.flags.provider[0] : undefined

				if( !modelName )
					return session.update( this.help )

				try {
					const info = await LLMao.show({ model: modelName }, providerKey )
					const embed = Embed().setTitle( `Model Info: ${modelName}` )

					if( info.details ){
						const detailsStr = [
							info.details.family && `**Family:** ${info.details.family}`,
							info.details.parameter_size && `**Parameters:** ${info.details.parameter_size}`,
							info.details.quantization_level && `**Quantization:** ${info.details.quantization_level}`,
							info.details.format && `**Format:** ${info.details.format}`,
						].filter( Boolean ).join( '\n' )

						if( detailsStr )
							embed.addFields({ name: 'Details', value: detailsStr })
					}

					if( info.system ){
						const sys = info.system.length > 1000 ? info.system.slice( 0, 1000 ) + '...' : info.system
						embed.addFields({ name: 'System Prompt', value: sys })
					}

					if( info.template ){
						const tpl = info.template.length > 1000 ? info.template.slice( 0, 1000 ) + '...' : info.template
						embed.addFields({ name: 'Template', value: '```\n' + tpl + '\n```' })
					}

					return session.update( embed )
				} catch( error ){
					return session.update( `Failed to show model \`${modelName}\`: ${error.message || error}` )
				}
			},
		})

		ollamaCmd.addSubcommand({
			aliases: 'pull download',
			description: {
				single: 'pulls a model from Ollama library',
				usages: [
					['<model>', 'pulls $1 model from registry'],
				],
			},
			flags: [
				[`provider`, `<key>`, `provider key`],
			],
			async callback({ args, session }){
				const model = args[0]
				const providerKey = args.flags.provider?.specified ? args.flags.provider[0] : undefined

				if( !model )
					return session.update( 'Please specify a model to pull.' )

				await session.update( processing( `Pulling \`${model}\`...` ) )

				try {
					const stream = await LLMao.pull({ model, stream: true }, providerKey )
					let lastUpdate = 0
					let lastStatus = ''

					for await ( const part of stream ){
						let statusMsg = part.status || 'Pulling...'

						if( part.total && part.completed ){
							const percent = Math.round( ( part.completed / part.total ) * 100 )
							statusMsg += ` (${percent}%)`
						}

						const now = Date.now()

						if( statusMsg !== lastStatus && now - lastUpdate > 1500 ){
							lastUpdate = now
							lastStatus = statusMsg
							await session.update( processing( statusMsg ) )
						}
					}

					return session.update( `Successfully pulled model \`${model}\`` )
				} catch( error ){
					return session.update( `Failed to pull model \`${model}\`: ${error.message || error}` )
				}
			},
		})

		ollamaCmd.addSubcommand({
			aliases: 'delete rm remove',
			description: {
				single: 'deletes a local Ollama model',
				usages: [
					['<model>', 'deletes $1 model'],
				],
			},
			flags: [
				[`provider`, `<key>`, `provider key`],
			],
			async callback({ args, session }){
				const model = args[0]
				const providerKey = args.flags.provider?.specified ? args.flags.provider[0] : undefined

				if( !model )
					return session.update( 'Please specify a model to delete.' )

				try {
					await LLMao.delete({ model }, providerKey )
					return session.update( `Successfully deleted model \`${model}\`` )
				} catch( error ){
					return session.update( `Failed to delete model \`${model}\`: ${error.message || error}` )
				}
			},
		})

		ollamaCmd.addSubcommand({
			aliases: 'default set-default model',
			description: {
				single: 'gets or sets the default model',
				usages: [
					['gets current default model'],
					['<model>', 'sets default model to $1'],
				],
			},
			async callback({ args, session }){
				const model = args[0]

				if( model ){
					LLMao.setDefaultModel( model )
					return session.update( `Default model set to: \`${model}\`` )
				}

				const current = LLMao.getDefaultModel()
				return session.update( `Current default model: \`${current}\`` )
			},
		})
	}, // init
}
