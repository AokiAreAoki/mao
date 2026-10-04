const SegmentedTTLQueue = require('@/libs/SegmentedTTLQueue');

const HYDRATION_DELAY = 5 * 60e3

class BakaCache {
	/**
	 * Creates a BakaCache instance
	 * @param {BakaDB} bakaDB - An existing BakaDB instance
	 * @param {string | string[]} path - Path to where the cache data should be stored
	 * @param {Object} [options={}]
	 * @param {number} [options.segmentSize=100]
	 * @param {number} [options.regenerateThrottle=50]
	 */
	constructor(bakaDB, path, options = {}) {
		if (!Array.isArray(path)) {
			path = [path];
		}

		this.db = bakaDB;
		this.path = path;

		// Initialize standalone TTL queue
		this.ttlQueue = new SegmentedTTLQueue({
			segmentSize: options.segmentSize,
			regenerateThrottle: options.regenerateThrottle,
			onExpire: key => this.db.delete(...this.path, key)
		});

		// Schedule TTL queue hydrating from persistent DB on boot
		this.scheduledHydration = setTimeout(() => {
			this._regenerateTTLQueue();
		}, HYDRATION_DELAY);
	}

	/**
	 * Set a value in the cache
	 * @param {string} key
	 * @param {*} value
	 * @param {number} [ttlMs] - Time to live in milliseconds
	 */
	set(key, value, ttlMs) {
		const newRecord = { value };
		const now = Date.now();
		const oldRecord = this._getRawRecord(key);

		if (typeof ttlMs === 'number' && ttlMs > 0) {
			newRecord.expireAt = now + ttlMs;
		}

		// Clean up old queue entry if existing record had expiration
		if (oldRecord && oldRecord.expireAt) {
			this.ttlQueue.remove(key, oldRecord.expireAt);
		}

		this.db.set(...this.path, key, newRecord);

		if (newRecord.expireAt) {
			this.ttlQueue.push(key, newRecord.expireAt);
		}

		this.db.save();
	}

	/**
	 * Get a value from the cache
	 * @param {string} key
	 * @returns {*}
	 */
	get(key) {
		const record = this._getRawRecord(key);
		if (!record) return undefined;

		if (record.expireAt && Date.now() >= record.expireAt) {
			this.delete(key);
			return undefined;
		}
		return record.value;
	}

	/**
	 * Check if a key exists in the cache
	 * @param {string} key
	 * @returns {boolean}
	 */
	has(key) {
		const record = this._getRawRecord(key);
		if (!record) return false;

		if (record.expireAt && Date.now() >= record.expireAt) {
			this.delete(key);
			return false;
		}
		return true;
	}

	/**
	 * Delete a value from the cache
	 * @param {string} key
	 * @returns {boolean}
	 */
	delete(key) {
		const record = this._getRawRecord(key);
		if (!record) return false;

		if (record.expireAt) {
			this.ttlQueue.remove(key, record.expireAt);
		}

		this.db.delete(...this.path, key);
		this.db.save();
		return true;
	}

	/**
	 * Clear the entire cache
	 */
	clear() {
		this.ttlQueue.clear();

		const data = this.db.get(...this.path) || {};
		const keys = Object.keys(data);
		for (const key of keys) {
			this.db.delete(...this.path, key);
		}
		this.db.save();
	}

	/**
	 * Synchronously purges expired entries from storage via the queue.
	 * @returns {number} Count of evicted items
	 */
	purgeExpired() {
		const evictedKeys = this.ttlQueue.purgeExpired(Date.now());
		if (evictedKeys.length > 0) {
			this.db.save();
		}
		return evictedKeys.length;
	}

	/**
	 * Cleanup resources and background timers.
	 */
	destroy() {
		clearTimeout(this.scheduledHydration);
		this.ttlQueue.destroy();
	}

	// --- Internal Helpers ---

	_getRawRecord(key) {
		return this.db.get(...this.path, key);
	}

	_collectExpirableEntries() {
		const data = this.db.get(...this.path) || {};
		const expEntries = [];

		for (const key in data) {
			const record = data[key];

			if (record && record.expireAt) {
				expEntries.push({ key, expireAt: record.expireAt });
			}
		}

		return expEntries;
	}

	/**
	 * Non-blocking incremental regeneration of the queue.
	 * @returns {Promise<void>}
	 */
	_regenerateTTLQueue() {
		this.ttlQueue.regenerate(this._collectExpirableEntries());
	}
}

module.exports = BakaCache;