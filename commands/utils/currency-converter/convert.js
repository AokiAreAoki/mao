// eslint-disable-next-line no-global-assign
require = global.alias(require)

const numsplit = require( '@/functions/numsplit' )
const prettyRound = require( '@/functions/prettyRound' )

const getCurrencyRates = require( './getCurrencyRates' )

module.exports = async function convert( amount, currencyFrom, currencyTo ) {
	const rates = await getCurrencyRates()
	currencyFrom = currencyFrom.toUpperCase()
	currencyTo = currencyTo.toUpperCase()

	if( !rates[currencyFrom] || !rates[currencyTo] )
		return null

	amount = amount == null ? 1 : amount
	const rate = currencyFrom === currencyTo ? 1 : rates[currencyTo] / rates[currencyFrom]

	const value2 = amount * rate

	return {
		value: `${numsplit( amount )} ${currencyFrom} is ${numsplit( prettyRound( value2 ) )} ${currencyTo}`,
		isSameCurrency: currencyFrom === currencyTo,
		isZero: amount === 0,
	}
}