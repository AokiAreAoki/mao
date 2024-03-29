// eslint-disable-next-line no-global-assign
require = global.alias(require)
const BakaDB = require( '@/re/bakadb' )
const List = require( '@/re/list' )
const { flags } = require( '@/index' )

const bakadb = new BakaDB()

bakadb.init( flags.dev ? './test/bdb' : './bdb', {
	List: List,
})

bakadb.autoSave( 5 * 60 )
bakadb.on( 'missing-encoder', encoder => console.log( `[WARNING] Missing "${encoder}" encoder` ) )
bakadb.on( 'missing-decoder', decoder => console.log( `[WARNING] Missing "${decoder}" decoder` ) )
module.exports = bakadb