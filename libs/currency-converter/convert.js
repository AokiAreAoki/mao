// eslint-disable-next-line no-global-assign
require = global.alias(require)

const getCurrencyRates = require( './getCurrencyRates' )

module.exports = async function convert( inputValue, currencyFrom, currencyTo ) {
	const rates = await getCurrencyRates()
	currencyFrom = currencyFrom.toUpperCase()
	currencyTo = currencyTo.toUpperCase()

	if( !rates[currencyFrom] || !rates[currencyTo] )
		return null

	inputValue = inputValue == null ? 1 : inputValue
	const rate = currencyFrom === currencyTo ? 1 : rates[currencyTo] / rates[currencyFrom]

	const outputValue = inputValue * rate

	return {
		currencyFrom,
		currencyTo,
		valueFrom: inputValue,
		valueTo: outputValue,
		isSameCurrency: currencyFrom === currencyTo,
		isZero: inputValue === 0,
	}
}