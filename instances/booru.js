// eslint-disable-next-line no-global-assign
require = global.alias(require)
const bakadb = require( '@/instances/bakadb' )
const Booru = require( '@/re/booru-wrapper' )
const TagCacher = require( '@/re/tag-cacher' )
const Embed = require( '@/functions/Embed' )
const tokens = require( '@/tokens.yml' )
const config = require( '@/config.yml' )
const { getProxyAgent } = require( '@/instances/proxy' )

function proxyAgent(){
	return getProxyAgent( 'booru' )
}

function credentialAgent(){
	return tokens.gelbooru
}

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
	let description = title || `[${linkTitle || this.booru.config.name || '<unknown booru>'}](${this.postURL})`

	if( addFields || displayTags ){
		const types = new Map( TagCacher.tagTypes.map( type => [type, []] ) )

		this.tags.forEach( tag => {
			types.get( tag.type ).push( tag )
		})

		const fields = displayTags
			? Array.from( types.entries(), ([type, tags]) => ({
				name: type,
				value: tags
					.map( tag => `\`${tag.name}\`` )
					.join( ', ' ),
			}))
			: displayableTagTypes.map( type => ({
				name: type,
				value: types
					.get( type )
					.map( tag => `\`${tag.name}\`` )
					.join( ', ' ),
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

	if( this.unsupportedExtension )
		description += `\n\n[<raw video link>](${this.full})`

	return embed
		.setDescription( description )
		.setImage( this.unsupportedExtension ? this.thumbnail : this.sample )
		.setFooter({ text: new Date().toLocaleString( 'ru' ) })
}

const tagCacher = new TagCacher({
	...config.boorus.gelbooru.tags,
	proxyAgent,
	credentialAgent,
})

tagCacher.tags = bakadb.fallback({
	path: 'tags/gelbooru',
	defaultValue: () => ({}),
})

const Gelbooru = new Booru({
	config: {
		...config.boorus.gelbooru.posts,
		keys: {
			id( post, pic, tags ){
				tags = tags.replace( /\s+/g, '+' )
				pic.id = post.id
				pic.postURL = `https://gelbooru.com/index.php?page=post&s=view&id=${pic.id}&tags=${tags.replace( /\)/g, '%29' )}`
			},
			score: '',
			file_url( post, pic ){
				pic.hasSample = post.sample == 1
				pic.sample = post.file_url
				pic.full = post.file_url

				if( /\.(jpe?g|png|gif|bmp)$/i.test( pic.full ) ){
					pic.sample = pic.hasSample && !pic.full.endsWith( '.gif' )
						? pic.full.replace( /\/images\/((\w+\/)+)(\w+\.)\w+/, '/samples/$1sample_$3jpg' )
						: pic.full
				} else
					pic.unsupportedExtension = pic.full.matchFirst( /\.(\w+)$/i ).toUpperCase()
			},
		},
	},
	removeOtherKeys: false,
	tagCacher,
	tagFetcher( tags ){
		return tagCacher.resolveTags( new Set( tags ) )
	},
	proxyAgent,
	credentialAgent,
})

const Yandere = new Booru({
	config: {
		...config.boorus.yandere.posts,
		keys: {
			id( post, pic ){
				pic.id = post.id
				pic.postURL = 'https://yande.re/post/show/' + pic.id
			},
			score: '',
			file_url: 'full',
			sample_url: 'sample',
			created_at: ( post, pic ) => pic.created_at = post.created_at * 1000,
		},
	},
	removeOtherKeys: false,
	tagCacher,
	tagFetcher( tags ){
		return tagCacher.resolveTags( new Set( tags ) )
	},
	proxyAgent,
})

// Yandere.config.constParams._token = _tkns.booru_proxy // proxy token

module.exports = {
	Gelbooru,
	Yandere,
}