module.exports = process.platform === 'win32'
	? `./temp` // %TEMP% sucks balls; god bless windows
	: `/tmp`
