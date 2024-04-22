const { extname } = require( 'path' )

/**
 * @typedef {Object} Media
 * @property {string} url
 * @property {string} filename
 */

/**
 * @param {import('discord.js').Message} msg
 * @returns {Media[]}
 */
function getMedia( msg ){
	const existingFilenames = new Set()

	/**
	 * @param {import('discord.js').Message} msg
	 * @param {string} url
	 * @returns {string}
	 */
	function getName( msg, url ){
		const filename = msg.id + '_' + url.split( '/' ).pop().split( '?' )[0]

		if( !existingFilenames.has( filename ) ){
			existingFilenames.add( filename )
			return filename
		}

		const extension = extname( filename )
		const name = filename.slice( 0, -extension.length )
		let newFilename
		let index = 0

		do {
			newFilename = `${ name }_${ ++index }${ extension }`
		} while( existingFilenames.has( newFilename ) )

		existingFilenames.add( newFilename )
		return newFilename
	}

	return [
		...( msg.content?.match( /(https?:\/\/\S+\.(jpe?g|png|webp|gif|bmp))/gi ) || [] ),
		...msg.attachments
			.filter( a => a.contentType.indexOf( 'image' ) !== -1 )
			.map( a => a?.url ),
		...msg.embeds
			.filter( e => !!e.image )
			.map( e => e?.image?.url ),
	]
		.filter( url => !!url )
		.map( url => {
			const filename = getName( msg, url )

			return { url, filename }
		})
}

module.exports = getMedia