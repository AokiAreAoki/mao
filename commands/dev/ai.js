// eslint-disable-next-line no-global-assign
require = global.alias(require)

module.exports = {
	init({ addCommand }){
		const ollama = require( '@/instances/ollama' )
		const bakadb = require( '@/instances/bakadb' )
		const Embed = require( '@/utils/Embed' )
		const processing = require( '@/utils/processing' )

		const RESPONDING_MESSAGE_OPTIONS = {
			useEvenInterval: true,
			tailMode: true,
		}

		const THINKING_MESSAGE_OPTIONS = {
			useEvenInterval: true,
			tailMode: true,
			cb: "markdown",
		}

		function formatBytes( bytes ){
			if( !bytes || isNaN( bytes ) )
				return '0 B'

			const k = 1024
			const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
			const i = Math.floor( Math.log( bytes ) / Math.log( k ) )

			return `${( bytes / Math.pow( k, i ) ).toFixed( 2 )} ${sizes[i]}`
		}

		function getDefaultModel(){
			return bakadb.fallback({
				path: ['ai', 'defaultModel'],
				defaultValue: () => 'qwen3:8b',
			})
		}

		/** @type {('high' | 'medium' | 'low')[]} */
		const THINK_LEVELS = ['high', 'medium', 'low']

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
			description: 'AI helper commands powered by Ollama',
		})

		root.addSubcommand({
			aliases: 'chat',
			description: {
				single: 'chats with AI model via Ollama',
				usages: [
					['<prompt...>', 'sends prompt to AI model'],
				],
			},
			flags: [
				[`model`, `<model_name>`, `model to use for chat`],
				[`think`, `<level>`, `thinking level ('high', 'medium', 'low', true, false)`],
				[`temperature`, `<val>`, `temperature parameter for generation`],
			],
			async callback({ args, session }){
				const prompt = args.join( ' ' ).trim()

				if( !prompt )
					return session.update( this.help )

				const model = args.flags.model?.specified
					? args.flags.model[0]
					: getDefaultModel()

				const think = args.flags.think?.specified
					? parseThink( args.flags.think[0] )
					: undefined

				const options = {
					stop: ["<|eot_id|>", "<|im_end|>"],
					repeat_penalty: 1.15, // Values between 1.1 and 1.2 discourage repetition without breaking grammar
					frequency_penalty: 0.5,
					temperature: 0.7,
					top_p: 0.9,
					num_predict: 512,
					num_ctx: 1024 * 16,
				}

				if( args.flags.temperature?.specified ){
					const temp = parseFloat( args.flags.temperature[0] )

					if( !isNaN( temp ) )
						options.temperature = temp
				}

				session.update( processing( `-# thinking...` ) )

				try {
					const response = await ollama.chat({
						model,
						messages: [{ role: 'user', content: prompt }],
						stream: true,
						think,
						options,
					})

					let responseText = ''
					let thinkingText = ''
					let lastUpdatePromise = null

					for await ( const part of response ){
						responseText += part.message.content
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

		const ollamaCmd = root.addSubcommand({
			aliases: 'ollama',
			description: 'manages Ollama models and settings',
		})

		ollamaCmd.addSubcommand({
			aliases: 'list ls',
			description: {
				single: 'lists available local Ollama models',
				usages: [
					['lists local models'],
				],
			},
			async callback({ session }){
				try {
					const { models } = await ollama.list()

					if( !models || models.length === 0 )
						return session.update( 'No local models found.' )

					const defaultModel = getDefaultModel()

					const list = models.map( m => {
						const isDefault = ( m.name === defaultModel || m.model === defaultModel ) ? ' ⭐ (default)' : ''
						const size = formatBytes( m.size )
						const details = m.details ? ` (${m.details.parameter_size || ''} ${m.details.quantization_level || ''})`.trim() : ''

						return `• \`${m.name}\` - ${size}${details ? ' ' + details : ''}${isDefault}`
					}).join( '\n' )

					return session.update( Embed()
						.setTitle( 'Local Ollama Models' )
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
			async callback({ session }){
				try {
					const { models } = await ollama.ps()

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
			aliases: 'show info',
			description: {
				single: 'shows detailed info about a model',
				usages: [
					['[<model>]', 'shows details for model (defaults to current default model)'],
				],
			},
			async callback({ args, session }){
				const modelName = args[0] || getDefaultModel()

				if( !modelName )
					return session.update( this.help )

				try {
					const info = await ollama.show({ model: modelName })
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
			async callback({ args, session }){
				const model = args[0]

				if( !model )
					return session.update( 'Please specify a model to pull.' )

				await session.update( processing( `Pulling \`${model}\`...` ) )

				try {
					const stream = await ollama.pull({ model, stream: true })
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
			async callback({ args, session }){
				const model = args[0]

				if( !model )
					return session.update( 'Please specify a model to delete.' )

				try {
					await ollama.delete({ model })
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
					bakadb.set( 'ai', 'defaultModel', model )
					bakadb.save()
					return session.update( `Default model set to: \`${model}\`` )
				}

				const current = getDefaultModel()
				return session.update( `Current default model: \`${current}\`` )
			},
		})
	} // init
}
