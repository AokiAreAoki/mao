const NUMBER_SPLITTER_RE = /[\s_,]+/g

module.exports = function parsePrettyNumber( amount ){
	return Number( amount.replace( NUMBER_SPLITTER_RE, '' ) )
}