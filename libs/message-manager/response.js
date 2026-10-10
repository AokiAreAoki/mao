// eslint-disable-next-line no-global-assign
require = global.alias( require )

const MetaDataStore = require('@/libs/meta-data-store');
const transformMessagePayload = require( '@/utils/transformMessagePayload' )
const wait = require( '@/utils/wait' );
const { Message, TextChannel } = require( 'discord.js' )

const DISCORD_API_MESSAGE_QUOTA = 5
const DISCORD_API_MESSAGE_QUOTA_TIME_WINDOW = 5e3
const DISCORD_API_MESSAGE_EVEN_INTERVAL = DISCORD_API_MESSAGE_QUOTA_TIME_WINDOW / DISCORD_API_MESSAGE_QUOTA
const DEFAULT_MAX_LENGTH = 1850

/**
 * Splits a long text into seamless markdown chunks under maxLength.
 * Closest newline is prioritized, and open code blocks or inline formatting
 * are closed at chunk boundaries and reopened at the start of the next chunk.
 *
 * @param {string} text
 * @param {number} [maxLength=1850]
 * @returns {string[]}
 */
function splitMessageMarkdown( text, maxLength = DEFAULT_MAX_LENGTH ){
	if( typeof text !== 'string' || text.length <= maxLength )
		return [text]

	const chunks = []
	let remaining = text

	while( remaining.length > 0 ){
		if( remaining.length <= maxLength ){
			chunks.push( remaining )
			break
		}

		let splitIndex = maxLength

		// 1. Look for closest newline before maxLength (within last 400 chars)
		const lastNewline = remaining.lastIndexOf( '\n', maxLength )
		if( lastNewline > 0 && ( maxLength - lastNewline ) < 400 ){
			splitIndex = lastNewline
		} else {
			// 2. Otherwise look for closest space (within last 200 chars)
			const lastSpace = remaining.lastIndexOf( ' ', maxLength )
			if( lastSpace > 0 && ( maxLength - lastSpace ) < 200 ){
				splitIndex = lastSpace
			}
		}

		let chunk = remaining.slice( 0, splitIndex )
		let nextPart = remaining.slice( splitIndex )

		if( nextPart.startsWith( '\n' ) )
			nextPart = nextPart.slice( 1 )

		// Inspect code blocks (```)
		const codeBlockRegex = /(?:^|\n)```([a-zA-Z0-9_+-]*)?/g
		let match
		let inCodeBlock = false
		let currentLang = ''

		while( ( match = codeBlockRegex.exec( chunk ) ) !== null ){
			if( !inCodeBlock ){
				inCodeBlock = true
				currentLang = match[1] || ''
			} else {
				inCodeBlock = false
				currentLang = ''
			}
		}

		if( inCodeBlock ){
			chunk += '\n```'
			nextPart = '```' + currentLang + '\n' + nextPart
		} else {
			// Inline markdown tags: `, **, ~~, ||
			const openTags = []
			const strippedChunk = chunk.replace( /(?:^|\n)```[\s\S]*?\n```/g, '' )

			const singleBackticks = strippedChunk.match( /`/g )
			if( singleBackticks && singleBackticks.length % 2 !== 0 )
				openTags.push( '`' )

			const bolds = strippedChunk.match( /\*\*/g )
			if( bolds && bolds.length % 2 !== 0 )
				openTags.push( '**' )

			const strikes = strippedChunk.match( /~~/g )
			if( strikes && strikes.length % 2 !== 0 )
				openTags.push( '~~' )

			const spoilers = strippedChunk.match( /\|\|/g )
			if( spoilers && spoilers.length % 2 !== 0 )
				openTags.push( '||' )

			if( openTags.length > 0 ){
				const closeStr = [...openTags].reverse().join( '' )
				chunk += closeStr

				const openStr = openTags.join( '' )
				nextPart = openStr + nextPart
			}
		}

		chunks.push( chunk )
		remaining = nextPart
	}

	return chunks
}

class ResponseSession {
	response = null
	#isCanceled = false

	constructor( response ){
		this.response = response
	}

	update( content, options = {} ){
		content = transformMessagePayload( content, options )

		if( this.isCanceled )
			return null

		return this.response.update( content, options )
	}

	cancel(){
		this.#isCanceled = true
	}

	get isCanceled(){
		return this.#isCanceled
	}

	/** @typedef {'finished' | 'errored' | 'canceled'} ExitReason */

	/** @param {AsyncGenerator} iter */
	async runSessionCoroutine( iter ){
		/** @type {ExitReason} */
		let reason = 'finished'

		function onError( error ){
			console.error( error )
			this.update( error.stack, { cb: 'js' } )
			reason = 'errored'
			return { done: true }
		}

		do {
			if( this.isCanceled ){
				reason = 'canceled'
				break
			}
		} while( !( await iter.next().catch( onError ) ).done )

		return reason
	}
}

class Response {
	#session = null
	#pendingRequest = null
	#pendingContent = null

		// return this.metaDataStore.resolve( this.destination, 'answers' )?.answers || {}
		// this.metaDataStore.add( this.destination, 'answers' ).answers = val

	get session(){
		return this.#session
	}

	/**
	 * @param {Message | TextChannel} messageOrChannel
	 * @param {MetaDataStore} metaDataStore
	 */
	constructor( messageOrChannel, metaDataStore ){
		if( !( messageOrChannel instanceof Message ) && !( messageOrChannel instanceof TextChannel ) )
			throw Error( `Response destination must be a Discord Message or TextChannel` )

		if( !( metaDataStore instanceof MetaDataStore ) )
			throw Error( `Response metaDataStore must be an instance of MetaDataStore` )

		this.metaDataStore = metaDataStore
		this.destination = messageOrChannel
		this.resetSession()
	}

	resetSession(){
		this.#session?.cancel()
		this.#session = new ResponseSession( this )
		this.messages = []
	}

	async update( content, options = {} ){
		const useEvenInterval = !!options?.useEvenInterval
		const isMultiMessage = !!options?.multiMessage || !!options?.splitMarkdown || !!options?.seamlessSplit

		if( this.#pendingRequest instanceof Promise ){
			this.#pendingContent = content

			return this.#pendingRequest
				.then( () => {
					if( this.#pendingContent === content ){
						const pendingContent = this.#pendingContent
						this.#pendingContent = null
						return this.update( pendingContent, options )
					}

					return this.#pendingRequest
				})
		}

		if( isMultiMessage ){
			const rawContent = typeof content === 'object' && content !== null ? content.content : content

			if( typeof rawContent === 'string' && rawContent.length > ( options.maxLength || DEFAULT_MAX_LENGTH ) ){
				let chain = Promise.resolve()
				const chunks = splitMessageMarkdown( rawContent, options.maxLength || DEFAULT_MAX_LENGTH )
				const { answers } = this.metaDataStore.add( this.destination, 'answers' )

				const messagesPromise = Promise
					.all( Object
						.values( answers )
						.map( ms => ms.deserialize() )
					)
					.then( mm => mm.sort( ( a, b ) => a.createdTimestamp - b.createdTimestamp ) )

				for( let i = 0; i < chunks.length; i++ ){
					const chunkPayload = typeof content === 'object' && content !== null
						? transformMessagePayload( { ...content, content: chunks[i] }, options )
						: transformMessagePayload( chunks[i], options )

					chain = chain.then( async () => {
						const messages = await messagesPromise

						if( messages[i] && !messages[i].deleted ){
							if( messages[i].content !== chunkPayload )
								await messages[i].edit( chunkPayload )
						} else {
							messages[i] = await this.destination.send({ ...chunkPayload, reply: i === 0 })
						}
					})

					if( useEvenInterval ){
						chain = chain.then( async () => {
							await wait( DISCORD_API_MESSAGE_EVEN_INTERVAL )
						})
					}
				}

				if( this.messages.length > chunks.length ){
					chain = chain.then( async () => {
						const extraMessages = this.messages.splice( chunks.length )

						await Promise.all( extraMessages.map( async msg => {
							msg = await msg

							if( msg && !msg.deleted )
								return msg.delete().catch( () => {} )
						}) )
					})
				}

				return this.#pendingRequest = chain
					.then( () => {
						this.#pendingRequest = null
						return this.messages
					})
			}
		}

		// Single message mode: clean up any extra trailing messages if present
		if( this.messages.length > 1 ){
			const extraMessages = this.messages.splice( 1 )

			extraMessages.forEach( msg => {
				if( msg && !msg.deleted )
					msg.delete().catch( () => {} )
			})
		}

		const payload = transformMessagePayload( content, options )

		let chain = this.message && !this.message.deleted
			? this.message.edit( payload )
			: this.destination.send( payload )

		if( useEvenInterval ){
			chain = chain.then( async message => {
				await wait( DISCORD_API_MESSAGE_EVEN_INTERVAL )
				return message
			})
		}

		return this.#pendingRequest = chain
			.then( message => {
				this.#pendingRequest = null
				this.message = message

				return isMultiMessage ? [message] : message
			})
	}
}

Response.splitMessageMarkdown = splitMessageMarkdown

module.exports = Response