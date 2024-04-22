// eslint-disable-next-line no-global-assign
require = global.alias(require)

const wait = require( '@/functions/wait' )

/**
 * @typedef {Object} DownloaderCoroutineParams
 * @property {MediaExportState} state
 * @property {() => void} onStatusUpdate
 */

const MAX_CONCURRENT_DOWNLOADS = 10

/** @param {DownloaderCoroutineParams} params */
async function* createParallelDownloaderCoroutine({ state, onStatusUpdate }){
	let downloadsInProgress = 0
	const promises = []

	while( !state.fetchingDone || !state.downloadingDone ){
		yield wait( 100 )

		if( downloadsInProgress < MAX_CONCURRENT_DOWNLOADS ){
			const downloader = state.downloaders.shift()

			if( downloader ){
				++downloadsInProgress

				const promise = downloader()
					.then( result => {
						--downloadsInProgress
						++state.mediaDownloaded
						onStatusUpdate()
						return result
					})

				promises.push( promise )
			}
		}

		if( state.fetchingDone && state.downloaders.length === 0 && downloadsInProgress === 0 ){
			state.downloadingDone = true
			break
		}
	}

	for( const promise of promises )
		yield promise
}

module.exports = createParallelDownloaderCoroutine