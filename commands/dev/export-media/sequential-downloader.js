// eslint-disable-next-line no-global-assign
require = global.alias(require)

const wait = require( '@/functions/wait' )

/**
 * @typedef {Object} DownloaderCoroutineParams
 * @property {MediaExportState} state
 * @property {() => void} onStatusUpdate
 */

/** @param {DownloaderCoroutineParams} params */
async function* createSequentialDownloaderCoroutine({ state, onStatusUpdate }){
	while( !state.fetchingDone || !state.downloadingDone ){
		yield wait( 100 )

		const downloader = state.downloaders.shift()

		if( downloader ){
			yield downloader()
			++state.mediaDownloaded
			onStatusUpdate()
		}

		if( state.fetchingDone && state.downloaders.length === 0 ){
			state.downloadingDone = true
			break
		}
	}
}

module.exports = createSequentialDownloaderCoroutine