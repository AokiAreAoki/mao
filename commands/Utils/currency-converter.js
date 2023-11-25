// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const { currency_converter: token } = require( '@/tokens.yml' )
		const axios = require( 'axios' )
		const MM = require( '@/instances/message-manager' )
		const Embed = require( '@/functions/Embed' )
		const numsplit = require( '@/functions/numsplit' )
		const prettyRound = require( '@/functions/prettyRound' )

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

		addCommand({
			aliases: 'currencies crns',
			description: 'returns list of all available currencies',
			callback: async msg => msg.send( Embed()
				.setTitle( "Available currencies" )
				.setDescription( Object.keys( await getCurrencies() )
					.map( c => `\`${c}\`` )
					.join( ', ' ),
				)
				.addFields([{
					name: `Usage`,
					value: `• \`[<number>] <currency1> to <currency2>\`.`,
				}])
			),
		})

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

					const value2 = value * rate
					return `${numsplit( value )} ${a} is ${numsplit( prettyRound( value2 ) )} ${b}`
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