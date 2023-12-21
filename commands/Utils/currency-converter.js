// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const { currency_converter: token } = require( '@/tokens.yml' )
		const axios = require( 'axios' )
		const client = require( '@/instances/client' )
		const MM = require( '@/instances/message-manager' )
		const Embed = require( '@/functions/Embed' )
		const numsplit = require( '@/functions/numsplit' )
		const prettyRound = require( '@/functions/prettyRound' )
		const TimeSplitter = require( '@/re/time-splitter' )

		const MINIMAL_REFRESH_INTERVAL = 3600e3
		const CONVERSION_RE = /\b(\d[\d\s_,]*(?:\.[\d\s_,]+)?(?:e-?\d+)?)?\s*(\w{3})\s*to\s*(\w{3})\b/gi
		const NUMBER_SPLITTER_RE = /[\s_,]+/g

		const QUESTIONS = [
			`Are you silly?`,
			`Try different currency`,
			`You will not believe the result...`,
			`Shit, I don't know`,
		]

		client.once( 'ready', () => {
			QUESTIONS.push( client.emojis.resolve( `717358214185746543` ) )
		})

		let nextRefresh = -1
		let rates = null

		async function getCurrencyRates(){
			if( nextRefresh < Date.now() ){
				nextRefresh = Date.now() + 60e3

				return rates = axios.get( `https://v6.exchangerate-api.com/v6/${token}/latest/USD` )
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

						return rates = data.conversion_rates
					})
			}

			return rates
		}

		addCommand({
			aliases: 'currencies crns',
			description: 'returns list of all available currencies',
			callback: async ({ session }) => session.update( Embed()
				.setTitle( "Available currencies" )
				.setDescription( Object.keys( await getCurrencyRates() )
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
			const session = msg.response.session
			const expressions = Array.from( msg.content.matchAll( CONVERSION_RE ) )

			if( expressions.length === 0 )
				return

			const rates = await getCurrencyRates()
				.catch( err => {
					session.update( `Something went wrong :(\nI can't convert currency right now` )
					throw err
				})

			const exchangeRates = expressions
				.map( ([, value, a, b]) => {
					a = a.toUpperCase()
					b = b.toUpperCase()

					if( !rates[a] || !rates[b] )
						return

					value = value == null ? 1 : Number( value.replace( NUMBER_SPLITTER_RE, '' ) )
					const rate = a === b ? 1 : rates[b] / rates[a]

					if( isNaN( value ) || isNaN( rate ) )
						return

					const value2 = value * rate

					return {
						value: `${numsplit( value )} ${a} is ${numsplit( prettyRound( value2 ) )} ${b}`,
						isDumb: a === b || value === 0,
					}
				})
				.filter( Boolean )

			if( exchangeRates.length !== 0 ){
				if( exchangeRates.every( rate => rate.isDumb ) ){
					const index = Math.floor( Math.random() * QUESTIONS.length )
					session.update( QUESTIONS[index] )
				} else {
					session.update( Array
						.from( new Set( exchangeRates.map( rate => rate.value ) ) )
						.join( '\n' )
					)
				}

				return true
			}
		})
	}
}