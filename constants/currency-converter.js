const DB_DIRECTORY = 'currencyPresets'
const ERROR_MESSAGE = `Something went wrong`
const CONVERSION_ERROR_MESSAGE = `Something went wrong :(\nI can't convert currency right now`
const MAX_PRESET_CURRENCIES_COUNT = 10

const NUMBER_RE = `(\\d[\\d\\s_,]*(?:\\.[\\d\\s_,]+)?(?:e-?\\d+)?|\\d+)`
const SINGLE_NUMBER_RE = new RegExp( `\\b${NUMBER_RE}\\b`, 'gi' )
const CONVERSION_RE = new RegExp( `\\b${NUMBER_RE}?\\s*(\\w{3})\\s*to\\s*(\\w{3})\\b`, 'gi' )

module.exports = {
	DB_DIRECTORY,
	ERROR_MESSAGE,
	CONVERSION_ERROR_MESSAGE,
	MAX_PRESET_CURRENCIES_COUNT,
	NUMBER_RE,
	SINGLE_NUMBER_RE,
	CONVERSION_RE,
}