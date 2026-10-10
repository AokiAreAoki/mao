// eslint-disable-next-line no-global-assign
require = global.alias(require)
const BakaCache = require( '@/libs/bakadb/cache' )

/**
 * @typedef {Object} Meta
 * @property {number} editedTimestamp
 * @property {Record<Tag, unknown>} tags
 *
 * @typedef {import('@/libs/MessageSerializable')} MessageSerializable
 *
 * @typedef {keyof typeof DEFAULT_STATES} Tag
 */

const TRANSIENT_TAGS = [ 'is-command', 'is-ai-message', 'is-sed-ignored' ]

const DEFAULT_STATES = {
	'answers': {
		/** @type {Record<string, MessageSerializable>} */
		answers: {},
	},
	'invoker': {
		/** @type {MessageSerializable} */
		command: null,
	},
	'is-command': true,
	'is-ai-message': true,
	'is-sed-ignored': true,
}

class MetaDataStore {
	/**
	 * @param {Object} options
	 * @param {import('discord.js').Client} options.client
	 * @param {import('@/libs/bakadb')} options.bakaDB
	 * @param {string | string[]} options.path
	 * @param {number} options.ttl
	 */
	constructor({ client, bakaDB, path, ttl }){
		this.ttl = ttl
		this.client = client
		this.cache = new BakaCache( bakaDB, path )
	}

	/**
	 * @template {Tag} T
	 * @param {import('discord.js').Message} message
	 * @param {T} tag
	 * @returns {(typeof DEFAULT_STATES)[T]}
	 */
	add( message, tag ){
		/** @type {Meta} */
		let meta = this._getMeta( message )

		if( !meta ){
			/** @type {Meta} */
			meta = {
				editedTimestamp: message.editedTimestamp,
				tags: {},
			}
			this.cache.set( message.id, meta, this.ttl )
		}

		return meta.tags[tag] ??= structuredClone( DEFAULT_STATES[tag] )
	}

	/**
	 * @template {Tag} T
	 * @param {import('discord.js').Message} message
	 * @param {T} tag
	 * @returns {(typeof DEFAULT_STATES)[T] | null}
	 */
	resolve( message, tag ){
		/** @type {Meta} */
		const meta = this._getMeta( message )

		if( !meta )
			return null

		return meta.tags[tag] ?? null
	}

	/**
	 * Sets or updates a tag for a given message.
	 * @param {import('discord.js').Message} message
	 * @param {Tag} tag
	 */
	remove( message, tag ) {
		/** @type {Meta} */
		let meta = this._getMeta( message )

		if( !meta )
			return false

		delete meta.tags[tag]
		return true
	}

	/**
	 * Sets or updates a tag for a given message.
	 * @param {import('discord.js').Message} message
	 */
	removeAll( message ) {
		/** @type {Meta} */
		let meta = this._getMeta( message )

		if( !meta )
			return false

		this.cache.delete( message.id )
		return true
	}

	/**
	 * @private
	 * @param {import('discord.js').Message} message
	 * @returns {Meta | null}
	 */
	_getMeta( message ) {
		/** @type {Meta} */
		let meta = this.cache.get( message.id )

		if( !meta )
			return null

		if( meta.editedTimestamp !== message.editedTimestamp ){
			const newMeta = {
				editedTimestamp: message.editedTimestamp,
				tags: {},
			}

			for (const [tag, value] of Object.entries( meta.tags )) {
				if ( !TRANSIENT_TAGS.includes( tag ) ) {
					newMeta.tags[tag] = value
				}
			}

			this.cache.set( message.id, newMeta, this.ttl )
			return newMeta
		}

		return meta
	}
}

module.exports = MetaDataStore