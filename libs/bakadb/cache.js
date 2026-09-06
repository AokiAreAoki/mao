class BakaCache {
	/**
	 * Creates a BakaCache instance
	 * @param {BakaDB} bakaDB - An existing BakaDB instance
	 * @param {string | string[]} path - Path to where the cache data should be stored
	 */
	constructor(bakaDB, path) {
		if( !Array.isArray( path ) )
			path = [path]

		this.db = bakaDB;
		this.path = path;
		this.gcTimer = null;
		this._nextGCTime = Infinity;

		// Perform initial GC and scheduling for already existing data
		this._performGC();
	}

	/**
	 * Set a value in the cache
	 * @param {string} key
	 * @param {*} value
	 * @param {number} [ttlMs] - Time to live in milliseconds
	 */
	set(key, value, ttlMs) {
		const record = { value };

		if (typeof ttlMs === 'number' && ttlMs > 0) {
			record.expireAt = Date.now() + ttlMs;
		}

		this.db.set(...this.path, key, record);

		if (record.expireAt) {
			this._scheduleNextGC(record.expireAt);
		}

		this.db.save();
	}

	/**
	 * Get a value from the cache
	 * @param {string} key
	 * @returns {*}
	 */
	get(key) {
		const record = this.db.get(...this.path, key);
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
		const record = this.db.get(...this.path, key);
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
	 */
	delete(key) {
		this.db.delete(...this.path, key);
		this.db.save();
	}

	/**
	 * Clear the entire cache
	 */
	clear() {
		const data = this.db.get(...this.path) || {};
		const keys = Object.keys(data);
		for (const key of keys) {
			this.db.delete(...this.path, key);
		}
		this.db.save();

		if (this.gcTimer) {
			clearTimeout(this.gcTimer);
			this.gcTimer = null;
		}
		this._nextGCTime = Infinity;
	}

	_scheduleNextGC(newExpireAt) {
		const now = Date.now();

		if (this.gcTimer && newExpireAt >= this._nextGCTime) {
			return; // Already scheduled an earlier or equal GC
		}

		if (this.gcTimer) {
			clearTimeout(this.gcTimer);
		}

		const delay = newExpireAt - now;
		const safeDelay = Math.max(0, Math.min(delay, 2147483647)); // Max delay for setTimeout
		this._nextGCTime = newExpireAt;
		this.gcTimer = setTimeout(() => this._performGC(), safeDelay);
	}

	_performGC() {
		const data = this.db.get(...this.path) || {};
		const now = Date.now();
		let nextExpireAt = Infinity;
		const keysToDelete = [];

		for (const key in data) {
			const record = data[key];
			if (record && record.expireAt) {
				if (record.expireAt <= now) {
					keysToDelete.push(key);
				} else if (record.expireAt < nextExpireAt) {
					nextExpireAt = record.expireAt;
				}
			}
		}

		if (keysToDelete.length > 0) {
			for (const key of keysToDelete) {
				this.db.delete(...this.path, key);
			}
			this.db.save();
		}

		if (this.gcTimer) {
			clearTimeout(this.gcTimer);
			this.gcTimer = null;
		}

		if (nextExpireAt !== Infinity) {
			const delay = nextExpireAt - Date.now();
			const safeDelay = Math.max(0, Math.min(delay, 2147483647));
			this._nextGCTime = nextExpireAt;
			this.gcTimer = setTimeout(() => this._performGC(), safeDelay);
		} else {
			this._nextGCTime = Infinity;
		}
	}

	/**
	 * Cleanup resources
	 */
	destroy() {
		if (this.gcTimer) {
			clearTimeout(this.gcTimer);
			this.gcTimer = null;
		}
	}
}

module.exports = BakaCache;
