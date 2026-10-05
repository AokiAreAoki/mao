/**
 * Format a byte count using binary units.
 * @param {number} bytes
 * @param {{decimals?: number, invalid?: string}} [options]
 * @returns {string}
 */
module.exports = function formatBytes(bytes, { decimals = 2, invalid = '0 B' } = {}) {
	if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0)
		return invalid

	if (bytes < 1024)
		return `${bytes} B`

	const units = ['KB', 'MB', 'GB', 'TB', 'PB']
	let size = bytes / 1024
	let unitIndex = 0

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024
		unitIndex++
	}

	return `${size.toFixed(Math.max(0, decimals))} ${units[unitIndex]}`
}
