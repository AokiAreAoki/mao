// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const bakadb = require( '@/instances/bakadb' )
		const MM = require( '@/instances/message-manager' )
		const Embed = require( '@/functions/Embed' )
		const parsePrettyNumber = require( '@/functions/parsePrettyNumber' )

		const convert = require( './convert' )
		const formatRates = require( './formatRates' )
		const getCurrencyRates = require( './getCurrencyRates' )

		const NUMBER_RE = `(\\d[\\d\\s_,]*(?:\\.[\\d\\s_,]+)?(?:e-?\\d+)?|\\d+)`
		const SINGLE_NUMBER_RE = new RegExp( `\\b${NUMBER_RE}\\b`, 'gi' )
		const CONVERSION_RE = new RegExp( `/\\b${NUMBER_RE}?\\s*(\\w{3})\\s*to\\s*(\\w{3})\\b`, 'gi' )
		const MAX_PRESET_CURRENCIES_COUNT = 10

		function formatCurrencies( currencies ){
			return currencies
				.map( currency => `\`${currency}\`` )
				.join( ', ' )
		}

		const root = addCommand({
			aliases: 'currencies crns',
			description: {
				short: 'returns list of all available currencies',
				full: [
					`Converts currencies`,
					``,
					`Command-less shorthand for currency conversion`,
					`• \`[<number>]\` \`<currency1>\` to \`<currency2>\``,
				],
				usages: [
					['[<amount>]', '<currency1>', '<currency2>', 'converts $1 of $2 to $3'],
					['[<amount>]', '<currency>', 'converts $1 of $2 to all preset currencies'],
				]
			},
			flags: [
				['list', 'lists all available currencies']
			],
			async callback({ msg, args, session }) {
				if( args.flags.list.specified )
					return session.update( Embed()
						.setTitle( 'Available currencies' )
						.setDescription( formatCurrencies( Object.keys( await getCurrencyRates() ) ) )
					)

				if( !args[0] )
					return session.update( this.help )

				const amount = args[0].match( SINGLE_NUMBER_RE )
					? parsePrettyNumber( args.shift() )
					: 1
				const currencyFrom = args[0]?.toUpperCase()
				const currencyTo = args[1]?.toUpperCase()

				const wentWrong = err => {
					session.update( `Something went wrong :(\nI can't convert currency right now` )
					throw err
				}

				if( currencyTo ){
					const rate = await convert( amount, currencyFrom, currencyTo )
						.catch( wentWrong )

					return session.update( rate
						? formatRates( [rate] )
						: 'Invalid currency'
					)
				}

				const currencyPresets = bakadb.get( 'currencyPresets', msg.author.id )

				if( !currencyPresets || currencyPresets.length === 0 ){
					const command = [
						this.aliases[0],
						preset.aliases[0],
					].join( ' ' )

					return session.update( `You don't have any preset currencies. Use \`${command}\` to setup preset currencies.` )
				}

				const rates = await Promise.all( currencyPresets
					.map( async presetCurrency => {
						const rate = await convert( amount, currencyFrom, presetCurrency )
							.catch( wentWrong )

						if( currencyFrom === presetCurrency )
							rate.value = `~~${rate.value}~~`

						return rate
					})
				)

				return session.update( formatRates( rates ) )
			},
		})

		const preset = root.addSubcommand({
			aliases: 'preset',
			description: {
				single: 'presets currencies',
				usages: [
					['<...currencies>', ''],
				]
			},
			async callback({ msg, args, session }) {
				if( args.length === 0 )
					return session.update( `Please provide some currencies` )

				const rates = await getCurrencyRates()
				const currencies = Array
					.from( args )
					.map( arg => arg.toUpperCase() )

				const unknownCurrencies = currencies.filter( currency => !rates[currency] )

				if( unknownCurrencies.length !== 0 )
					return session.update( `Unknown currencies: ${formatCurrencies( unknownCurrencies )}` )

				if( unknownCurrencies.length > MAX_PRESET_CURRENCIES_COUNT )
					return session.update( `Too many currencies! (Max: ${MAX_PRESET_CURRENCIES_COUNT})` )

				bakadb.set( 'currencyPresets', msg.author.id, currencies )
				bakadb.save()

				return session.update( `Preset currencies: ${formatCurrencies( currencies )}` )
			},
		})

		MM.pushHandler( 'currency-converter', false, async msg => {
			const session = msg.response.session
			const expressions = Array.from( msg.content.matchAll( CONVERSION_RE ) )

			if( expressions.length === 0 )
				return

			const promises = expressions.map( async ([, amount, from, to]) => convert( amount, from, to )
				.catch( err => {
					session.update( `Something went wrong :(\nI can't convert currency right now` )
					throw err
				})
			)

			const exchangeRates = Promise
				.all( promises )
				.filter( Boolean )

			if( exchangeRates.length !== 0 ){
				session.update( formatRates( exchangeRates ) )
				return true
			}
		})
	}
}