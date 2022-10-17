// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const { currency_converter: token } = require( '@/tokens.yml' )
		const axios = require( 'axios' )
		const MM = require( '@/instances/message-manager' )
		const numsplit = require( '@/functions/numsplit' )

		const convertRE = /\b(\d[\d\s_,]*(?:\.[\d\s_,]+)?(?:e-?\d+)?)?\s*(\w{3})\s*to\s*(\w{3})\b/gi
		const numSplitterRE = /[\s_,]+/g

		let nextFetch = -1
		let rates = null

		async function getCurrencies(){
			if( nextFetch < Date.now() ){
				nextFetch = Date.now() + 60e3

				return rates = axios.get( `https://v6.exchangerate-api.com/v6/${token}/latest/USD` )
					.then( ({ data }) => {
						if( data.result === 'error' ){
							nextFetch = -1
							throw Error( `[ExchangeRate-API] Error: ${data['error-type']}` )
						}

						nextFetch = data.time_next_update_unix
						return rates = data.conversion_rates
					})
			}

			return rates
		}

		MM.pushHandler( 'currency-converter', false, async msg => {
			const expressions = Array.from( msg.content.matchAll( convertRE ) )

			if( expressions.length === 0 )
				return

			const filter = {}
			const currencies = await getCurrencies()
				.catch( err => {
					msg.send( `Something went wrong :(\nI can't convert currency right now` )
					throw err
				})

			const exchangeRates = expressions
				.map( ([, value, a, b]) => {
					a = a.toUpperCase()
					b = b.toUpperCase()

					if( !currencies[a] || !currencies[b] )
						return

					value = value == null ? 1 : Number( value.replace( numSplitterRE, '' ) )
					const rate = a === b ? 1 : rates[b] / rates[a]

					if( isNaN( value ) || isNaN( rate ) )
						return

					let value2 = value * rate
					let zeros = value2 < 1 ? 1e3 : 1e2

					if( value2 >= 1e-3 )
						value2 = Math.round( value2 * zeros ) / zeros

					return `${numsplit( value )} ${a} is ${numsplit( value2 )} ${b}`
				})
				.filter( rate => {
					if( !rate )
						return false

					const isFirst = !filter[rate]
					filter[rate] = true
					return isFirst
				})

			if( exchangeRates.length !== 0 ){
				msg.send( exchangeRates.join( '\n' ) )
				return true
			}
		})
	}
}