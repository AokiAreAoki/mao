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

		const DB_DIRECTORY = 'currencyPresets'
		const NUMBER_RE = `(\\d[\\d\\s_,]*(?:\\.[\\d\\s_,]+)?(?:e-?\\d+)?|\\d+)`
		const SINGLE_NUMBER_RE = new RegExp( `\\b${NUMBER_RE}\\b`, 'gi' )
		const CONVERSION_RE = new RegExp( `\\b${NUMBER_RE}?\\s*(\\w{3})\\s*to\\s*(\\w{3})\\b`, 'gi' )
		const MAX_PRESET_CURRENCIES_COUNT = 10

		function formatCurrencies( currencies ){
			if( currencies.length === 0 )
				return 'none'

			return currencies
				.map( currency => `\`${currency}\`` )
				.join( ', ' )
		}

		async function validateCurrencies( currencies ){
			currencies = currencies.map( c => c.toUpperCase() )

			const rates = await getCurrencyRates()
			const unknownCurrencies = currencies.filter( currency => !rates[currency] )

			if( unknownCurrencies.length !== 0 )
				throw Error( `Unknown currencies: ${formatCurrencies( unknownCurrencies )}` )

			if( unknownCurrencies.length > MAX_PRESET_CURRENCIES_COUNT )
				throw Error( `Too many currencies! (Max: ${MAX_PRESET_CURRENCIES_COUNT})` )

			return currencies
		}

		function getUserPreset( uid ){
			return bakadb.fallback({
				path: [DB_DIRECTORY, uid],
				defaultValue: [],
			})
		}

		function setUserPreset( uid, currencies ){
			bakadb.set( DB_DIRECTORY, uid, currencies )
			bakadb.save()
		}

		const single = 'converts currencies'

		const root = addCommand({
			aliases: 'exchange-rate er',
			description: {
				short: single,
				full: [
					single,
					'',
					'Command-less shorthand for currency conversion:',
					'• `[<amount>]` `<currency1>` to `<currency2>`',
				],
				usages: [
					['[<amount>]', '<currency1>', '<currency2>', 'converts $1 of $2 to $3'],
					['[<amount>]', '<currency>', 'converts $1 of $2 to preset currencies'],
				]
			},
			flags: [
				['list', 'lists all available currencies'],
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

				const currencyPreset = getUserPreset( msg.author.id )

				if( !currencyPreset || currencyPreset.length === 0 ){
					const command = [
						this.aliases[0],
						preset.aliases[0],
					].join( ' ' )

					return session.update( `You don't have any preset currencies. Use \`${command}\` to set them.` )
				}

				const rates = await Promise.all( currencyPreset
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
				single: 'gets preset currencies',
				usages: [
					['gets current preset'],
				],
			},
			async callback({ msg, args, session }) {
				if( args.length !== 0 )
					return session.update( this.help )

				const currencies = getUserPreset( msg.author.id )

				return session.update( currencies.length === 0
					? `You have no preset currencies`
					: `Your current preset currencies: ${formatCurrencies( currencies )}`
				)
			},
		})

		preset.addSubcommand({
			aliases: 'set',
			description: {
				single: 'sets preset currencies',
				usages: [
					['<...currencies>', 'sets new currency preset to $1'],
				],
			},
			async callback({ msg, args, session }) {
				if( args.length === 0 )
					return session.update( `Please provide some currencies` )

				return validateCurrencies( Array.from( args ) )
					.then( currencies => {
						setUserPreset( msg.author.id, currencies )

						return session.update( `Currency preset changed to: ${formatCurrencies( currencies )}` )
					})
					.catch( error => session.update( error ) )
			},
		})

		preset.addSubcommand({
			aliases: 'add',
			description: {
				single: 'adds currencies to the preset',
				usages: [
					['<...currencies>', 'adds $1 to the current currency preset'],
				],
			},
			async callback({ msg, args, session }) {
				if( args.length === 0 )
					return session.update( `Please provide some currencies` )

				return validateCurrencies( Array.from( args ) )
					.then( currenciesToAdd => {
						const currenciesSet = new Set( getUserPreset( msg.author.id ) )

						for( const currency of currenciesToAdd )
							currenciesSet.add( currency )

						const newCurrencies = Array.from( currenciesSet )
						setUserPreset( msg.author.id, newCurrencies )

						return session.update( `Added ${formatCurrencies( currenciesToAdd )} to the preset.\nCurrent preset: ${formatCurrencies( newCurrencies )}` )
					})
					.catch( error => session.update( error ) )
			},
		})

		preset.addSubcommand({
			aliases: 'remove delete',
			description: {
				single: 'removes currencies from the preset',
				usages: [
					['<...currencies>', 'removes $1 from the current currency preset'],
				],
			},
			async callback({ msg, args, session }) {
				if( args.length === 0 )
					return session.update( `Please provide some currencies` )

				return validateCurrencies( Array.from( args ) )
					.then( currenciesToRemove => {
						const currenciesSet = new Set( getUserPreset( msg.author.id ) )

						for( const currency of currenciesToRemove )
							currenciesSet.delete( currency )

						const newCurrencies = Array.from( currenciesSet )
						setUserPreset( msg.author.id, newCurrencies )

						return session.update( `Removed ${formatCurrencies( currenciesToRemove )} from the preset.\nCurrent preset: ${formatCurrencies( newCurrencies )}` )
					})
					.catch( error => session.update( error ) )
			},
		})

		MM.pushHandler( 'currency-converter', false, async msg => {
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
						.catch( err => {
							session.update( `Something went wrong :(\nI can't convert currency right now` )
							throw err
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