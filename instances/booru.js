// eslint-disable-next-line no-global-assign
require = global.alias
const HttpsProxyAgent = require( 'https-proxy-agent' )
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
}

/** Proxies:
 * proxy.antizapret.prostovpn.org
 * proxy-ssl.antizapret.prostovpn.org
 * proxy-fbtw-ssl.antizapret.prostovpn.org
 * proxy-nossl.antizapret.prostovpn.org
 * vpn.antizapret.prostovpn.org
 */

const httpsAgent = new HttpsProxyAgent({
	host: 'proxy.antizapret.prostovpn.org',
	port: '80',
	// auth: 'username:password',
})

const Gelbooru = new Booru({
	...config.boorus.gelbooru.posts,
	keys: {
		id( post, pic, tags ){
			tags = tags.replace( /\s+/g, '+' )
			pic.id = post.id
			pic.post_url = `https://gelbooru.com/index.php?page=post&s=view&id=${pic.id}&tags=${tags.replace( /\)/g, '%29' )}`
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
	remove_other_keys: false,
	tag_fetcher( tags ){
		return this.tagCacher.resolveTags( new Set( tags.split( /\s+/ ) ) )
	},
})

Gelbooru.httpsAgent = httpsAgent
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
		id( post, pic ){
			pic.id = post.id
			pic.post_url = 'https://yande.re/post/show/' + pic.id
		},
		score: '',
		file_url: 'full',
		sample_url: 'sample',
		created_at: ( post, pic ) => pic.created_at = post.created_at * 1000,
	},
	remove_other_keys: false,
	tag_fetcher( tags ){
		return this.tagCacher.resolveTags( new Set( tags.split( /\s+/ ) ) )
	},
})

Yandere.httpsAgent = httpsAgent
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