// eslint-disable-next-line no-global-assign
require = global.alias(require)

const binarySearch = require("@/utils/binarySearch")

function findIndex(arr, key, targetTime) {
	let idx = binarySearch(arr, targetTime, item => item.expireAt, 'left') - 1;

	while (idx >= 0 && arr[idx].expireAt === targetTime) {
		if (arr[idx].key === key) return idx;
		idx--;
	}

	return -1;
}

const MIN_GC_DELAY = 5e3;
const GC_RESCHEDULE_DELAY = 1e3;

/**
 * @typedef {Object} Entry
 * @property {string} key
 * @property {number} expireAt
 */

/**
 * SegmentedTTLQueue - A standalone, segmented binary-searched TTL queue.
 */
class SegmentedTTLQueue {
	/** @type {Entry[][] } */
	segments = [];

	/** @type {number} */
	nextGCAt = -1;

	/** @type {number | null} */
	gcScheduledFor = null;

	/** @type {NodeJS.Timeout | null} */
	gcScheduleTimeout = null;

	/** @type {NodeJS.Timeout | null} */
	gcTimeout = null;

	/** @type {NodeJS.Timeout | null} */
	regenerationTimeout = null;

	/** @type {AbortController | null} */
	regenerationAbortController = null;

	/**
	 * @param {Object} [options={}]
	 * @param {number} [options.segmentSize=100] - Max elements per segment
	 * @param {number} [options.regenerateThrottle=50] - Delay (ms) between batch steps during regeneration
	 * @param {Function} [options.onExpire] - Optional callback `(key) => void` executed per evicted item in purge
	 */
	constructor(options = {}) {
		this.segmentSize = Math.max(1, options.segmentSize ?? 100);
		this.regenerateThrottle = options.regenerateThrottle ?? 50;
		this.onExpire = options.onExpire || null;
	}

	/**
	 * Insert a key with an expiration timestamp into the queue.
	 * @param {string} key
	 * @param {number} expireAt
	 */
	push(key, expireAt) {
		/** @type {Entry} */
		const entry = { key, expireAt };

		if (this.segments.length === 0) {
			this.segments.push([entry]);
		} else {
			for (let i = 0; i < this.segments.length; i++) {
				const seg = this.segments[i];

				if (seg.length === 0)
					continue

				const maxInSeg = seg.at(-1).expireAt;

				if (expireAt <= maxInSeg || i === this.segments.length - 1) {
					const insIdx = binarySearch(seg, expireAt, item => item.expireAt, 'right');
					seg.splice(insIdx, 0, entry);

					if (seg.length > this.segmentSize) {
						this._splitSegment(i);
					}

					break;
				}
			}
		}

		this.scheduleGC()
	}

	/**
	 * Remove a key from the queue.
	 * @param {string} key
	 * @param {number} expireAt
	 * @returns {boolean}
	 */
	remove(key, expireAt) {
		for (let i = 0; i < this.segments.length; i++) {
			const seg = this.segments[i];
			if (seg.length === 0) continue;

			const minInSeg = seg[0].expireAt;
			const maxInSeg = seg[seg.length - 1].expireAt;

			if (expireAt >= minInSeg && expireAt <= maxInSeg) {
				const idx = findIndex(seg, key, expireAt);

				if (idx !== -1) {
					seg.splice(idx, 1);

					if (seg.length === 0) {
						this.segments.splice(i, 1);
					}

					this.scheduleGC()
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Synchronously purges expired items starting from the leading segment.
	 * @param {number} [now=Date.now()]
	 * @returns {string[]} Array of evicted keys
	 */
	purgeExpired() {
		const now = Date.now();
		const evictedKeys = [];

		while (this.segments.length > 0) {
			const seg = this.segments[0];
			let cutIdx = 0;

			while (cutIdx < seg.length && seg[cutIdx].expireAt <= now) {
				const { key } = seg[cutIdx];
				evictedKeys.push(key);
				if (this.onExpire) this.onExpire(key);
				cutIdx++;
			}

			if (cutIdx > 0) {
				seg.splice(0, cutIdx);
			}

			if (seg.length === 0) {
				this.segments.shift();
			} else {
				break; // Leading non-expired item reached
			}
		}

		this.nextGCAt = Date.now() + MIN_GC_DELAY;
		this.scheduleGC()
		return evictedKeys;
	}

	scheduleGC(force = false) {
		if (!force) {
			this.gcScheduleTimeout ??= setTimeout(() => {
				this.gcScheduleTimeout = null;
				this.scheduleGC(true);
			}, GC_RESCHEDULE_DELAY).unref();

			return;
		}

		const soonestExpire = this.segments[0]?.[0]?.expireAt ?? null;

		if (!soonestExpire) {
			if (this.gcTimeout) {
				clearTimeout(this.gcTimeout);
				this.gcTimeout = null;
			}

			this.gcScheduledFor = null

			return;
		}

		if (!this.gcScheduledFor || this.gcScheduledFor > soonestExpire) {
			this.gcScheduledFor = soonestExpire

			const expiresIn = soonestExpire - Date.now()
			const nextGCIn = this.nextGCAt - Date.now()
			const delay = Math.max(0, expiresIn, nextGCIn)

			clearTimeout(this.gcTimeout);
			this.gcTimeout = setTimeout(() => {
				this.gcTimeout = null;
				this.gcScheduledFor = null;
				this.purgeExpired();
			}, delay);
		}
	}

	/**
	 * Non-blocking incremental queue regeneration over time.
	 * @param {Entry[]} entries - Raw array of `{ key, expireAt }` entries
	 * @returns {Promise<void>}
	 */
	regenerate(entries) {
		this.cancelRegeneration();

		this.segments = [];
		this.regenerationAbortController = new AbortController();
		let index = 0;

		const promise = new Promise((resolve, reject) => {
			const processBatch = () => {
				if (this.regenerationAbortController.signal.aborted) {
					this.regenerationTimeout = null;
					this.regenerationAbortController = null;

					reject(new Error('Regeneration aborted'));
					return;
				}

				const nextChunkEndsAt = Math.min(index + this.segmentSize, entries.length)

				for (; index < nextChunkEndsAt; ++index) {
					const { key, expireAt } = entries[index];
					this.push(key, expireAt);
				}

				if (index < entries.length) {
					this.regenerationTimeout = setTimeout(processBatch, this.regenerateThrottle);
					this.regenerationTimeout.unref();
				} else {
					resolve();
				}
			}

			processBatch();
		});

		promise.then(() => this.scheduleGC());

		return promise
	}

	/**
	 * Clear all segments and active timers.
	 */
	clear() {
		this.cancelRegeneration();
		this.segments = [];
	}

	cancelRegeneration() {
		if (this.regenerationAbortController) {
			this.regenerationAbortController.abort();
		}
	}

	_splitSegment(index) {
		const seg = this.segments[index];
		const mid = Math.floor(seg.length / 2);
		const rightHalf = seg.splice(mid);
		this.segments.splice(index + 1, 0, rightHalf);
	}

	destroy() {
		this.cancelRegeneration();
	}
}

module.exports = SegmentedTTLQueue;