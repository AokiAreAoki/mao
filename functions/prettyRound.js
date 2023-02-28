
module.exports = function prettyRound( value ){
	if( value >= 1e-3 ){
		const zeros = value < 1 ? 3 : 2
		return Math.round( value, zeros )
	}

	return value
}
