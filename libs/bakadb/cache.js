// eslint-disable-next-line no-global-assign
require = global.alias(require)
const binarySearch = require( "@/utils/binarySearch" );

function findIndex(arr, key, targetTime) {
	let idx = binarySearch(arr, targetTime, undefined, 'right') - 1;

	while (idx >= 0 && arr[idx][1] === targetTime) {
		if (arr[idx][0] === key) return idx;
		idx--;
	}

	return -1;
}

class BakaCache {
	/**
	 * Creates a BakaCache instance
	 * @param {BakaDB} bakaDB - An existing BakaDB instance
	 * @param {string | string[]} path - Path to where the cache data should be stored
	 * @param {Object} [options={}]
	 * @param {number} [options.segmentSize=100] - Max entries per segment in the TTL queue
	 * @param {number} [options.regenerateThrottle=50] - Throttle time (ms) per batch step during queue regeneration
	 */
	constructor(bakaDB, path, options = {}) {
		if (!Array.isArray(path)) {
			path = [path];
		}

		this.db = bakaDB;
		this.path = path;

		this.segmentSize = Math.max(1, options.segmentSize ?? 100);
		this.regenerateThrottle = options.regenerateThrottle ?? 50;

		// 2D Array of Array<[key, expireAt]> (each inner segment is sorted by expireAt asc)
		this._segments = [];

		// Regeneration state tracking
		this._regenTimer = null;
		this._regenState = null;

		// Initialize queue from existing persistence layer
		this._initQueueFromDB();
	}

	/**
	 * Set a value in the cache
	 * @param {string} key
	 * @param {*} value
	 * @param {number} [ttlMs] - Time to live in milliseconds
	 */
	set(key, value, ttlMs) {
		const record = { value };
		const now = Date.now();
		const oldRecord = this._getRawRecord(key);

		if (typeof ttlMs === 'number' && ttlMs > 0) {
			record.expireAt = now + ttlMs;
		}

		// Remove old key from queue if expireAt was set previously
		if (oldRecord && oldRecord.expireAt) {
			this._removeFromQueue(key, oldRecord.expireAt);
		}

		this.db.set(...this.path, key, record);

		if (record.expireAt) {
			this._insertIntoQueue(key, record.expireAt);
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
			this._removeFromQueue(key, record.expireAt);
		}

		this.db.delete(...this.path, key);
		this.db.save();
		return true;
	}

	/**
	 * Clear the entire cache
	 */
	clear() {
		this._cancelRegeneration();
		this._segments = [];

		const data = this.db.get(...this.path) || {};
		const keys = Object.keys(data);
		for (const key of keys) {
			this.db.delete(...this.path, key);
		}
		this.db.save();
	}

	/**
	 * Synchronously purges expired items starting from the leading segments of the queue.
	 * @returns {number} Count of evicted keys
	 */
	purgeExpired() {
		const now = Date.now();
		let evicted = 0;

		while (this._segments.length > 0) {
			const seg = this._segments[0];
			let cutIdx = 0;

			while (cutIdx < seg.length && seg[cutIdx][1] <= now) {
				const [key] = seg[cutIdx];
				this.db.delete(...this.path, key);
				evicted++;
				cutIdx++;
			}

			if (cutIdx > 0) {
				seg.splice(0, cutIdx);
			}

			if (seg.length === 0) {
				this._segments.shift();
			} else {
				break; // Leading non-expired item reached
			}
		}

		if (evicted > 0) {
			this.db.save();
		}

		return evicted;
	}

	/**
	 * Non-blocking incremental regeneration of the queue over time.
	 * Re-sorts and re-chunks active expireAt entries without blocking execution.
	 * @returns {Promise<void>}
	 */
	regenerate() {
		this._cancelRegeneration();

		const data = this.db.get(...this.path) || {};
		const expEntries = [];

		for (const key in data) {
			const record = data[key];
			if (record && record.expireAt) {
				expEntries.push([key, record.expireAt]);
			}
		}

		expEntries.sort((a, b) => a[1] - b[1]);

		const total = expEntries.length;
		this._regenState = {
			entries: expEntries,
			index: 0,
			newSegments: []
		};

		return new Promise((resolve) => {
			const processBatch = () => {
				if (!this._regenState) {
					resolve();
					return;
				}

				const { entries, index, newSegments } = this._regenState;
				const limit = Math.min(index + this.segmentSize, total);

				if (index < limit) {
					const chunk = entries.slice(index, limit);
					newSegments.push(chunk);
					this._regenState.index = limit;
				}

				if (this._regenState.index >= total) {
					this._segments = newSegments;
					this._cancelRegeneration();
					resolve();
				} else {
					this._regenTimer = setTimeout(processBatch, this.regenerateThrottle);
				}
			};

			processBatch();
		});
	}

	/**
	 * Cleanup active background timers/tasks.
	 */
	destroy() {
		this._cancelRegeneration();
	}

	// --- Internal Queue & Storage Helpers ---

	_getRawRecord(key) {
		return this.db.get(...this.path, key);
	}

	_initQueueFromDB() {
		const data = this.db.get(...this.path) || {};
		const expEntries = [];

		for (const key in data) {
			const record = data[key];
			if (record && record.expireAt) {
				expEntries.push([key, record.expireAt]);
			}
		}

		expEntries.sort((a, b) => a[1] - b[1]);

		this._segments = [];
		for (let i = 0; i < expEntries.length; i += this.segmentSize) {
			this._segments.push(expEntries.slice(i, i + this.segmentSize));
		}
	}

	_insertIntoQueue(key, expireAt) {
		const tuple = [key, expireAt];

		if (this._segments.length === 0) {
			this._segments.push([tuple]);
			return;
		}

		for (let i = 0; i < this._segments.length; i++) {
			const seg = this._segments[i];
			const maxInSeg = seg[seg.length - 1][1];

			if (expireAt <= maxInSeg || i === this._segments.length - 1) {
				const insIdx = binarySearch(seg, expireAt, undefined, 'right');
				seg.splice(insIdx, 0, tuple);

				if (seg.length > this.segmentSize) {
					this._splitSegment(i);
				}
				return;
			}
		}
	}

	_removeFromQueue(key, expireAt) {
		for (let i = 0; i < this._segments.length; i++) {
			const seg = this._segments[i];
			if (seg.length === 0) continue;

			const minInSeg = seg[0][1];
			const maxInSeg = seg[seg.length - 1][1];

			if (expireAt >= minInSeg && expireAt <= maxInSeg) {
				const idx = findIndex(seg, key, expireAt);
				if (idx !== -1) {
					seg.splice(idx, 1);
					if (seg.length === 0) {
						this._segments.splice(i, 1);
					}
					return;
				}
			}
		}
	}

	_splitSegment(index) {
		const seg = this._segments[index];
		const mid = Math.floor(seg.length / 2);
		const rightHalf = seg.splice(mid);
		this._segments.splice(index + 1, 0, rightHalf);
	}

	_cancelRegeneration() {
		if (this._regenTimer !== null) {
			clearTimeout(this._regenTimer);
			this._regenTimer = null;
		}
		this._regenState = null;
	}
}

module.exports = BakaCache;