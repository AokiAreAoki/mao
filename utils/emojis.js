// eslint-disable-next-line no-global-assign
require = global.alias(require)

const client = require( '@/instances/client' )

const CATALOGUE = {
	"loading": "822881934484832267",
	"suspicious": "717358214185746543",
}

class EmojiCatalogue {
	/** @type {Record<keyof (typeof CATALOGUE), import('discord.js').GuildEmoji>} */
	_cache = {}

	/** @param {import('discord.js').Client} */
	constructor( client ){
		this.client = client
	}

	/**
	 * @param {keyof (typeof CATALOGUE)} name
	 * @returns {import('discord.js').GuildEmoji | null}
	 */
	get( name ){
		return this._cache[name] ??= this.client.emojis.resolve( CATALOGUE[name] )
	}
}

const emojiCatalogue = new EmojiCatalogue( client )

module.exports = emojiCatalogue