// eslint-disable-next-line no-global-assign
require = global.alias(require)

module.exports = /**
 * @param {import("@/libs/bakadb")} bakadb
 */
function( bakadb ){
	const List = require( '@/libs/list' )

	/** @param {List} list */
	const serialize = list => 'List:' + list.toString()

	/** @param {string} data */
	const deserialize = data => new List( data )

	bakadb.createCoder( List, serialize, deserialize )
}