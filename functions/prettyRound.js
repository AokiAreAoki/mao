const _ = require( 'lodash' )

module.exports = function prettyRound( value ){
	if( value >= 1e-3 ){
		const zeros = value < 1 ? 3 : 2
		return _.round( value, zeros )
	}

	return value
}
