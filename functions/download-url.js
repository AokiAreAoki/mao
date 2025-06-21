// eslint-disable-next-line no-global-assign
require = global.alias(require)

const axios = require( 'axios' )
const fs = require( 'fs' )

const { getProxyAgent } = require( '@/instances/proxy' )

/**
 * @param {string} url
 * @param {string} path
 * @returns {Promise<boolean>}
 */
const downloadURL = async ( url, path ) => axios
	.get( url, {
		responseType: 'stream',
		httpAgent: getProxyAgent( 'yt-dlp' ),
		httpsAgent: getProxyAgent( 'yt-dlp' ),
	})
	.then( response => {
		const stream = response.data.pipe( fs.createWriteStream( path ) )

		return new Promise( resolve => {
			stream.once( 'finish', () => {
				resolve( true )
			})

			stream.once( 'error', error => {
				console.error( error )
				resolve( false )
			})
		})
	})
	.catch( error => {
		console.error( error )
		return false
	})

module.exports = downloadURL