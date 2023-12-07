module.exports = function(milliseconds) {
	return new Promise(resolve => {
		setTimeout(resolve, milliseconds)
	})
}