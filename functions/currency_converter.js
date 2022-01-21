module.exports = {
	requirements: '_tkns axios MM numsplit Embed',
	init: ( requirements, mao ) => {
		// return
		requirements.define( global )

		const convertRE = /\b(\d[\d\s_,]*(?:\.[\d\s_,]+)?(?:e-?\d+)?)?\s*(\w{3})\s*to\s*(\w{3})\b/gi
		const numSplitterRE = /[\s_,]+/g

		const ratios = { USD: { ratio: 1 } } // USD based
		let currenciesNextFetch = 0
		let currencies = null

		async function getCurrencies(){
			if( currenciesNextFetch < Date.now() || !currencies ){
				currenciesNextFetch = Date.now() + 86400e3

				return currencies = axios.get( `https://free.currconv.com/api/v7/currencies`, {
					params: {
						apiKey: _tkns.currency_converter,
					}
				})
					.then( response => currencies = response.data.results )
			}

			return currencies
		}

		async function getRatio( a, b ){
			if( a === b )
				return 1

			const unknownRatios = []

			if( a !== 'USD' ){
				if( !ratios[a] || ratios[a].timeout < Date.now() ){
					ratios[a] = null
					unknownRatios.push(a)
				}
			}

			if( b !== 'USD' ){
				if( !ratios[b] || ratios[b].timeout < Date.now() ){
					ratios[b] = null
					unknownRatios.push(b)
				}
			}

			if( unknownRatios.length !== 0 ){
				const { data } = await axios.get( `https://free.currconv.com/api/v7/convert`, {
					params: {
						q: unknownRatios.map( u => `USD_${u}` ).join( ',' ),
						compact: 'ultra',
						apiKey: _tkns.currency_converter,
					}
				})

				for( const currency in data )
					ratios[currency.substring(4)] = {
						ratio: data[currency],
						timeout: Date.now() + 3600e3,
					}
			}

			return ratios[b].ratio / ratios[a].ratio
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

			const exchangeRates = ( await Promise.all(
				expressions.map( async ([, value, a, b]) => {
					a = a.toUpperCase()
					b = b.toUpperCase()

					if( !currencies[a] || !currencies[b] )
						return

					value = value == null ? 1 : Number( value.replace( numSplitterRE, '' ) )
					const ratio = await getRatio( a, b )

					if( isNaN( value ) || isNaN( ratio ) )
						return

					let value2 = value * ratio
					let zeros = value2 < 1 ? 1e3 : 1e2

					if( value2 >= 1e-3 )
						value2 = Math.round( value2 * zeros ) / zeros

					return `${numsplit( value )} ${a} is ${numsplit( value2 )} ${b}`
				})
			))
				.filter( rate => {
					const isFirst = !filter[rate]
					filter[rate] = true
					return isFirst
				})
				.join( '\n' )

			if( exchangeRates ){
				msg.send( exchangeRates )
				return true
			}
		})
	}
}