// eslint-disable-next-line no-global-assign
require = global.alias(require)

const axios = require( 'axios' )
const fs = require( 'fs' )
const { join } = require( 'path' )

const { proxyAgent } = require( '@/instances/proxy' )

/**
 * @param {Media} media
 * @param {string} path
 * @returns {Promise<boolean>}
 */
async function downloadURL( media, path ){
	return axios.get( media.url, {
		responseType: 'stream',
		httpAgent: proxyAgent(),
		httpsAgent: proxyAgent(),
	})
		.then( response => {
			const filePath = join( path, media.filename )
			const stream = response.data.pipe( fs.createWriteStream( filePath ) )

			return new Promise( resolve => {
				stream.once( 'finish', () => {
					resolve(true)
				})

				stream.once( 'error', error => {
					console.error( error )
					resolve(false)
				})
			})
		})
		.catch( error => {
			console.error( error )
			return false
		})
}

module.exports = downloadURL