module.exports = process.platform === 'win32'
	? '%TEMP%'
	: "/tmp"
