// eslint-disable-next-line no-global-assign
require = global.alias
const Booru = require( '@/re/booru-wrapper' )
const Embed = require( '@/functions/Embed' )
const tokens = require( '@/tokens.yml' )
const config = require( '@/config.yml' )

Booru.BooruResponse.prototype.embed = function( pics, mapFunction = null ){
	if( typeof pics === 'number' )
		pics = this.results[pics]

	if( !( pics instanceof Array ) )
		pics = [pics]

	const videos = []
	const embeds = pics.map( pic => {
		if( pic.unsupportedExtention )
			videos.push( pic.full )

		return Embed()
			.setDescription([
				`[${this.booru.name ?? '<insert booru name here>'}](${pic.post_url})`,
				// this.tags ? `tags: \`${this.tags}\`` : 'no tags',
				// `rating: \`${pic.rating}\``,
				// `score: \`${pic.score}\``,
			].join( ' | ' ) )
			.addFields(
				{
					name: 'tags',
					value: this.tags ? `\`${this.tags}\`` : 'none',
					inline: true,
				},
				{
					name: 'rating',
					value: `\`${pic.rating}\``,
					inline: true,
				},
				{
					name: 'score',
					value: `\`${pic.score}\``,
					inline: true,
				},
			)
			.setImage( pic.sample )
	})

	if( mapFunction instanceof Function )
		embeds.forEach( mapFunction )

	return {
		content: videos.join( '\n' ) || null,
		embeds,
	}
}

const Gelbooru = new Booru({
	...config.boorus.gelbooru,
	keys: {
		id: ( post, pic, tags ) => {
			tags = tags.replace( /\s+/g, '+' )
			pic.id = post.id
			pic.post_url = `https://gelbooru.com/index.php?page=post&s=view&id=${pic.id}&tags=${tags.replace( /\)/g, '%29' )}`
		},
		score: '',
		file_url: ( post, pic ) => {
			pic.hasSample = post.sample == 1
			pic.sample = post.file_url
			pic.full = post.file_url

			if( /\.(jpe?g|png|gif|bmp)$/i.test( pic.full ) ){
				pic.sample = pic.hasSample && !pic.full.endsWith( '.gif' )
					? pic.full.replace( /\/images\/((\w+\/)+)(\w+\.)\w+/, '/samples/$1sample_$3jpg' )
					: pic.full
			} else
				pic.unsupportedExtention = pic.full.matchFirst( /\.(\w+)$/i ).toUpperCase()
		}
	},
	remove_other_keys: false,
})

Gelbooru.const_params.api_key = tokens.gelbooru.api_key
Gelbooru.const_params.user_id = tokens.gelbooru.user_id
// Gelbooru.const_params._token = _tkns.booru_proxy // proxy token

const Yandere = new Booru({
	...config.boorus.yandere,
	keys: {
		id: ( post, pic ) => {
			pic.id = post.id
			pic.post_url = 'https://yande.re/post/show/' + pic.id
		},
		score: '',
		file_url: 'full',
		sample_url: 'sample',
		created_at: ( post, pic ) => pic.created_at = post.created_at * 1000
	},
	remove_other_keys: false,
})
// Yandere.const_params._token = _tkns.booru_proxy // proxy token

module.exports = {
	Gelbooru,
	Yandere,
}