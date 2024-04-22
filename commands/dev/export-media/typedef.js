/** @typedef {() => Promise<boolean>} Downloader */

/**
 * @typedef {Object} MediaExportState
 * @property {boolean} fetchingDone
 * @property {boolean} downloadingDone
 * @property {number} messagesFetched
 * @property {number} mediaDownloaded
 * @property {number} totalMedia
 * @property {Downloader[]} downloaders
 */
