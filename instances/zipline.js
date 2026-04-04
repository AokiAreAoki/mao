// eslint-disable-next-line no-global-assign
require = global.alias(require)
const tokens = require( '@/tokens.yml' )
const fs = require( 'fs' )
const path = require( 'path' )
const axios = require( 'axios' )
const mime = require( 'mime-types' )

const X_HEADER_FOLDER = "x-zipline-folder"
const X_HEADER_FORMAT = "x-zipline-format"
const X_HEADER_DELETES_AT = "x-zipline-deletes-at"

const FILE_FORM_NAME = "file"
const DEFAULT_LIFETIME = 30 * 24 * 3600e3

module.exports = {
	/**
	 * @param {string} filePath
	 * @param {object} options
	 * @param {string} [options.folderID]
	 * @param {string} [options.format]
	 * @param {number} [options.deletesAt]
	 * @returns {Promise<string>}
	 */
	async upload( filePath, {
		folderID = undefined,
		format = "random",
		deletesAt = DEFAULT_LIFETIME,
	} = {} ){
		const config = tokens.zipline

		if(!config?.url || !config?.token) {
			throw Error( "Zipline `token` or `url` is missing" )
		}

		const fileBuffer = await fs.promises.readFile(filePath)
		const type = mime.lookup( filePath ) || 'application/octet-stream'
		const blob = new Blob([fileBuffer], { type })
		const form = new FormData()
		form.append( FILE_FORM_NAME, blob, path.basename( filePath ) )

		try {
			const url = `${config.url.replace( /\/+$/, "" )}/api/upload`
			const response = await axios.post( url, form, {
				headers: {
					authorization: config.token,
					[X_HEADER_FOLDER]: folderID,
					[X_HEADER_FORMAT]: format,
					[X_HEADER_DELETES_AT]: deletesAt,
				},
			})

			return response.data.files[0].url
		} catch (error) {
			console.error(error)
			throw error
		}
	}
}
