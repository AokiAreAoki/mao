// eslint-disable-next-line no-global-assign
require = global.alias(require)

const { flags } = require( '@/index' )
const includeFiles = require( '@/functions/includeFiles' )
const BakaDB = require( '@/libs/bakadb' )

const bakadb = new BakaDB({
	coders: {
		Function: {
			serialize: func => 'Function:' + String( func ),
			deserialize: str => `require = global.alias(require); ${eval( str )}`,
		},
	},
})

includeFiles({
	text: "[BakaDB] Initializing coders",
	query: './coders/*.js',
	callback: init => {
		init( bakadb )
	},
	cwd: __dirname,
})

bakadb.init( flags.dev ? './test/bdb' : './bdb' )

bakadb.autoSave( 5 * 60 )
bakadb.on( 'missing-serializer', serializer => console.warn( `[BakaDB] [WARNING] Missing "${serializer}" serializer` ) )
bakadb.on( 'missing-deserializer', deserializer => console.warn( `[BakaDB] [WARNING] Missing "${deserializer}" deserializer` ) )
module.exports = bakadb