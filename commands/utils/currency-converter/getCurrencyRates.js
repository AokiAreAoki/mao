// eslint-disable-next-line no-global-assign
require = global.alias(require)

const axios = require( 'axios' )
const TimeSplitter = require( '@/re/time-splitter' )
const { currency_converter: token } = require( '@/tokens.yml' )

const MINIMAL_REFRESH_INTERVAL = 3600e3

let nextRefresh = -1
let rates = null

module.exports = async function getCurrencyRates(){
	if( nextRefresh < Date.now() ){
		nextRefresh = Date.now() + 60e3

		rates = axios.get( `https://v6.exchangerate-api.com/v6/${token}/latest/USD` )
			.then( ({ data }) => {
				if( data.result === 'error' ){
					nextRefresh = -1
					throw Error( `[ExchangeRate-API] Error: ${data['error-type']}` )
				}

				nextRefresh = Math.max( data.time_next_update_unix * 1e3, nextRefresh, Date.now() + MINIMAL_REFRESH_INTERVAL )

				const date = new Date( nextRefresh ).toString()
				const timeLeft = TimeSplitter
					.fromMS( nextRefresh - Date.now() )
					.toString({
						maxTU: 2,
						separator: ', ',
						ignoreZeros: true,
					})

				console.log( `[ExchangeRate-API] Cache refreshed. Next refresh in ${timeLeft} (${date})` )

				return data.conversion_rates
			})

		Object.freeze( rates )
	}

	return rates
}