// eslint-disable-next-line no-global-assign
require = global.alias
const bakadb = require( '@/instances/bakadb' )
const Booru = require( '@/re/booru-wrapper' )
const TagCacher = require( '@/re/tag-cacher' )
const Embed = require( '@/functions/Embed' )
const tokens = require( '@/tokens.yml' )
const config = require( '@/config.yml' )

const displayableTagTypes = [
	'artist',
	'character',
	'copyright',
]
Booru.Picture.prototype.embed = function({
	title,
	linkTitle,
	displayTags = false,
	addFields = true,
} = {} ){
	const embed = Embed()
	let description = title || `[${linkTitle || this.booru.name || '<unknown booru>'}](${this.post_url})`

	if( addFields || displayTags ){
		const types = new Map( TagCacher.tagTypes.map( type => [type, []] ) )

		this.tags.forEach( tag => {
			types.get( tag.type ).push( tag )
		})

		const fields = displayTags
			? Array.from( types.entries(), ([type, tags]) => ({
				name: type,
				value: tags.map( tag => `\`${tag.name}\`` ).join( ', ' ),
			}))
			: displayableTagTypes.map( type => ({
				name: type,
				value: types.get( type ).map( tag => `\`${tag.name}\`` ).join( '\n' ),
			}))

		fields.push(
			{
				name: 'rating',
				value: `\`${this.rating}\``,
				inline: true,
			},
			{
				name: 'score',
				value: `\`${this.score}\``,
				inline: true,
			},
		)

		embed.addFields( fields.filter( field => !!field.value ) )
	}

	if( this.unsupportedExtention )
		description += `\n\n[<raw video link>](${this.full})`

	return embed
		.setDescription( description )
		.setImage( this.unsupportedExtention ? this.thumbnail : this.sample )
}

const Gelbooru = new Booru({
	...config.boorus.gelbooru.posts,
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
	tag_fetcher( tags ){
		return this.tagCacher.resolveTags( new Set( tags.split( /\s+/ ) ) )
	},
})

Gelbooru.tagCacher = new TagCacher( config.boorus.gelbooru.tags )
Gelbooru.tagCacher.tags = bakadb.fallback({
	path: 'tags/gelbooru',
	defaultValue: {},
})

Gelbooru.const_params.api_key = tokens.gelbooru.api_key
Gelbooru.const_params.user_id = tokens.gelbooru.user_id
// Gelbooru.const_params._token = _tkns.booru_proxy // proxy token

const Yandere = new Booru({
	...config.boorus.yandere.posts,
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
	tag_fetcher( tags ){
		return this.tagCacher.resolveTags( new Set( tags.split( /\s+/ ) ) )
	},
})

Yandere.tagCacher = Gelbooru.tagCacher

///// sucks balls
// Yandere.tagCacher = new TagCacher( config.boorus.yandere.tags )
// Yandere.tagCacher.tags = bakadb.fallback({
// 	path: 'tags/yandere',
// 	defaultValue: {},
// })

// Yandere.const_params._token = _tkns.booru_proxy // proxy token

module.exports = {
	Gelbooru,
	Yandere,
}