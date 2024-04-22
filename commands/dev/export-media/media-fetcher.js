const getMedia = require( './get-media' )
const downloadURL = require( './download-url' )

/**
 * @typedef {Object} MediaFetcherCoroutineParams
 * @property {MediaExportState} state
 * @property {import('discord.js').Snowflake} before
 * @property {import('discord.js').TextChannel} channel
 * @property {number} limit
 * @property {string} mediaPath
 * @property {() => void} onStatusUpdate
 */

/** @param {MediaFetcherCoroutineParams} params */
async function* createMediaFetcherCoroutine({ state, before, channel, limit, mediaPath, onStatusUpdate }){
	let lastMessageId = before

	while( state.messagesFetched < limit ){
		const chunkLimit = Math.min( limit - state.messagesFetched, 100 )

		/** @type {import('discord.js').Message[]} */
		const messages = await channel.messages
			.fetch({
				limit: chunkLimit,
				before: lastMessageId,
			})
			.then( collection => collection.toArray() )
		yield

		const newDownloaders = messages
			.map( message => {
				const medias = getMedia( message )

				return medias.map( media => {
					return () => downloadURL( media, mediaPath )
				})
			})
			.flat()

		state.messagesFetched += messages.length
		state.downloaders.push( ...newDownloaders )
		state.totalMedia += newDownloaders.length
		onStatusUpdate()

		if( messages.length < chunkLimit )
			break

		lastMessageId = messages.at(-1).id
	}

	state.fetchingDone = true
}

module.exports = createMediaFetcherCoroutine