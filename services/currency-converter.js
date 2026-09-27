// eslint-disable-next-line no-global-assign
require = global.alias(require)

/** @type {import('@/libs/service-manager').Inclusion} */
module.exports = {
	id: "currency-converter",
	name: "Currency Converter",
	init({ sb }){
		const parsePrettyNumber = require( '@/utils/parsePrettyNumber' )
		const MESSAGE_HANDLER_PRIORITIES = require( '@/constants/message-handler-priorities' )

		const {
			convert,
			formatRates,
		} = require( '@/libs/currency-converter' )

		const {
			CONVERSION_ERROR_MESSAGE,
			SINGLE_NUMBER_RE,
			CONVERSION_RE,
		} = require( '@/constants/currency-converter' )

		sb.onMessage( MESSAGE_HANDLER_PRIORITIES.CURRENCY_CONVERTER, async msg => {
			const session = msg.response.session
			const expressions = Array.from( msg.content.matchAll( CONVERSION_RE ) )

			if( expressions.length === 0 )
				return

			const exchangeRates = await expressions
				.reduce( async ( acc, [, amount, from, to] ) => {
					amount = amount?.match( SINGLE_NUMBER_RE )
						? parsePrettyNumber( amount )
						: 1

					const conversion = await convert( amount, from, to )
						.catch( error => {
							session.update( CONVERSION_ERROR_MESSAGE )
							throw error
						})

					acc = await acc
					acc.push( conversion )
					return acc
				}, [] )
				.then( rates => rates.filter( Boolean ) )

			if( exchangeRates.length !== 0 ){
				session.update( formatRates( exchangeRates ) )
				return true
			}
		})
	}
}