// eslint-disable-next-line no-global-assign
require = global.alias(require)

module.exports = /**
 * @param {import("@/libs/bakadb")} bakadb
 */
function( bakadb ){
	/** @param {Promise} promise */
	function serialize( promise ) {
		if( !promise.bakadbIsAwaiting ){
			promise.bakadbIsAwaiting = true
			promise.then( () => this.save() )
		}
	}

	bakadb.createCoder( Promise, serialize, () => {} )
}