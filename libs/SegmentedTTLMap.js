// eslint-disable-next-line no-global-assign
require = global.alias(require)

const SegmentedTTLQueue = require('@/libs/SegmentedTTLQueue')

/**
 * @typedef {Object} TTLMapEntry
 * @property {*} value
 * @property {number | undefined} expireAt
 */

/**
 * A Map whose expiring entries are managed by SegmentedTTLQueue.
 */
class SegmentedTTLMap {
	/** @type {Map<string, TTLMapEntry>} */
	_entries = new Map()

	/** @type {SegmentedTTLQueue} */
	queue

	/** @type {((key: string, value: *) => void) | null} */
	onExpire

	/**
	 * @param {Object} [options={}]
	 * @param {number} [options.segmentSize=100]
	 * @param {number} [options.regenerateThrottle=50]
	 * @param {(key: string, value: *) => void} [options.onExpire]
	 */
	constructor(options = {}) {
		this.onExpire = options.onExpire || null
		this.queue = new SegmentedTTLQueue({
			segmentSize: options.segmentSize,
			regenerateThrottle: options.regenerateThrottle,
			onExpire: key => this._expire(key, true),
		})
	}

	/**
	 * Set an entry, optionally expiring it after `ttlMs` milliseconds.
	 * @param {string} key
	 * @param {*} value
	 * @param {number} [ttlMs]
	 * @returns {this}
	 */
	set(key, value, ttlMs) {
		const previous = this._entries.get(key)
		if (previous?.expireAt)
			this.queue.remove(key, previous.expireAt)

		const expireAt = typeof ttlMs === 'number' && ttlMs > 0
			? Date.now() + ttlMs
			: undefined

		this._entries.set(key, { value, expireAt })
		if (expireAt)
			this.queue.push(key, expireAt)

		return this
	}

	/**
	 * Get an entry's value, returning undefined when missing or expired.
	 * @param {string} key
	 * @returns {*}
	 */
	get(key) {
		const entry = this._entries.get(key)
		if (!entry)
			return undefined

		if (entry.expireAt && Date.now() >= entry.expireAt) {
			this._expire(key)
			return undefined
		}

		return entry.value
	}

	/**
	 * Check whether an entry exists and has not expired.
	 * @param {string} key
	 * @returns {boolean}
	 */
	has(key) {
		const entry = this._entries.get(key)
		if (!entry)
			return false

		if (entry.expireAt && Date.now() >= entry.expireAt) {
			this._expire(key)
			return false
		}

		return true
	}

	/**
	 * Delete an entry without invoking `onExpire`.
	 * @param {string} key
	 * @returns {boolean}
	 */
	delete(key) {
		const entry = this._entries.get(key)
		if (!entry)
			return false

		this._entries.delete(key)
		if (entry.expireAt)
			this.queue.remove(key, entry.expireAt)

		return true
	}

	/**
	 * Remove all entries without invoking `onExpire`.
	 */
	clear() {
		this.queue.clear()
		this._entries.clear()
	}

	/**
	 * Purge expired entries.
	 * @param {number} [now=Date.now()]
	 * @returns {number} Number of expired entries
	 */
	purgeExpired(now = Date.now()) {
		return this.queue.purgeExpired(now).length
	}

	/**
	 * Release queue resources and remove all entries.
	 */
	destroy() {
		this.clear()
		this.queue.destroy()
	}

	_expire(key, fromQueue = false) {
		const entry = this._entries.get(key)
		if (!entry?.expireAt || entry.expireAt > Date.now())
			return

		this._entries.delete(key)

		if (!fromQueue)
			this.queue.remove(key, entry.expireAt)

		this.onExpire?.(key, entry.value)
	}
}

module.exports = SegmentedTTLMap
