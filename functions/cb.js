module.exports = function cb( text, lang = '' ){
	return '```' + lang + '\n' + text + '```'
}