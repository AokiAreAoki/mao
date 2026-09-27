// eslint-disable-next-line no-global-assign
require = global.alias(require)
const emojiCatalogue = require( '@/utils/emojis' )

module.exports = function processing( fallback = 'Loading...' ){
	return emojiCatalogue.get( "loading" ) ?? fallback
}