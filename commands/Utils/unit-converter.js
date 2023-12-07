// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const { Collection } = require( 'discord.js' )
		const MM = require( '@/instances/message-manager' )
		const Embed = require( '@/functions/Embed' )
		const numsplit = require( '@/functions/numsplit' )
		const prettyRound = require( '@/functions/prettyRound' )

		const systems = new Collection([
			['Time', [
				{
					single: "Nanosecond",
					plural: "Nanoseconds",
					short: "ns",
					value: 1e9,
				},
				{
					single: "Microsecond",
					plural: "Microseconds",
					short: "us", // μs
					value: 1e6,
				},
				{
					single: "Millisecond",
					plural: "Milliseconds",
					short: "ms",
					value: 1e3,
				},
				{
					single: "Second",
					plural: "Seconds",
					short: "sec",
					value: 1,
				},
				{
					single: "Minute",
					plural: "Minutes",
					short: "min",
					value: 1 / 60,
				},
				{
					single: "Hour",
					plural: "Hours",
					short: "hr",
					value: 1 / 3600,
				},
				{
					single: "Day",
					plural: "Days",
					short: "d",
					value: 1 / 86400,
				},
				{
					single: "Week",
					plural: "Weeks",
					short: "wk",
					value: 1 / ( 86400 * 7 ),
				},
				{
					single: "Month",
					plural: "Months",
					short: "mn",
					value: 1 / ( 86400 * 30 ),
				},
				{
					single: "Year",
					plural: "Years",
					short: "yr",
					value: 1 / ( 86400 * 365.2425 ),
				},
			]],
			['Length', [
				{
					single: "Millimeter",
					plural: "Millimeters",
					short: "mm",
					value: 1000,
				},
				{
					single: "Centimeter",
					plural: "Centimeters",
					short: "cm",
					value: 100,
				},
				{
					single: "Meter",
					plural: "Meters",
					short: "m",
					value: 1,
				},
				{
					single: "Kilometer",
					plural: "Kilometers",
					short: "km",
					value: 0.001,
				},
				{
					single: "Inch",
					plural: "Inches",
					short: "in",
					value: 39.37008,
				},
				{
					single: "Foot",
					plural: "Feet",
					short: "ft",
					value: 3.28084,
				},
				{
					single: "Yard",
					plural: "Yards",
					short: "yd",
					value: 1.093613,
				},
				{
					single: "Mile",
					plural: "Miles",
					short: "mi",
					value: 0.000621,
				},
			]],
			['Area', [
				{
					single: "Millimeter square",
					plural: "Millimeters square",
					short: "mm2",
					value: 1000000,
				},
				{
					single: "Centimeter square",
					plural: "Centimeters square",
					short: "cm2",
					value: 10000,
				},
				{
					single: "Meter square",
					plural: "Meters square",
					short: "m2",
					value: 1,
				},
				{
					single: "Inch square",
					plural: "Inches square",
					short: "in2",
					value: 1550.003,
				},
				{
					single: "Foot square",
					plural: "Feet square",
					short: "ft2",
					value: 10.76391,
				},
				{
					single: "Yard square",
					plural: "Yards square",
					short: "yd2",
					value: 1.19599,
				},
			]],
			['Volume', [
				{
					single: "Centimeter cube",
					plural: "Centimeters cube",
					short: "cm3",
					value: 1000,
				},
				{
					single: "Meter cube",
					plural: "Meters cube",
					short: "m3",
					value: 0.001,
				},
				{
					single: "Liter",
					plural: "Liters",
					short: "ltr",
					value: 1,
				},
				{
					single: "Inch cube",
					plural: "Inches cube",
					short: "in3",
					value: 61,
				},
				{
					single: "Foot cube",
					plural: "Feet cube",
					short: "ft3",
					value: 0.035,
				},
				{
					single: "US gallon",
					plural: "US gallons",
					short: "US gal",
					value: 0.264201,
				},
				{
					single: "Imperial gallon",
					plural: "Imperial gallons",
					short: "Imp. gal",
					value: 0.22,
				},
				{
					single: "US barrel",
					plural: "US barrels",
					short: "US brl",
					value: 0.00629,
				},
			]],
			['Mass', [
				{
					single: "Grams",
					plural: "Grams",
					short: "g",
					value: 1000
				},
				{
					single: "Kilograms",
					plural: "Kilograms",
					short: "kg",
					value: 1
				},
				{
					single: "Metric Tonnes",
					plural: "Metric Tonnes",
					short: "tonne",
					value: 0.001
				},
				{
					single: "Short tons",
					plural: "Short tons",
					short: "shton",
					value: 0.001102
				},
				{
					single: "Long tons",
					plural: "Long tons",
					short: "Lton",
					value: 0.000984
				},
				{
					single: "Pounds",
					plural: "Pounds",
					short: "lb",
					value: 2.204586
				},
				{
					single: "Ounces",
					plural: "Ounces",
					short: "oz",
					value: 35.27337
				}
			]],
		])

		systems.forEach( units => units.forEach( unit => {
			unit.pluralTokens = unit.plural.toLowerCase().split( /\s+/ )
			unit.singleTokens = unit.single.toLowerCase().split( /\s+/ )
		}))

		const RE = /(\d+(?:[.,]\d+)?(?:e\d+)?)?\s*(\w+(?:\s+\w+)?)\s+to\s+(\w+(?:\s+\w+)?)/gi

		function unitHasToken( unit, tokens ){
			if( unit.short.toLowerCase() === tokens[0] )
				return true

			if( unit.singleTokens.length === tokens.length )
				if( unit.singleTokens.every( ( t, i ) => t === tokens[i] ) )
					return true

			if( unit.pluralTokens.length === tokens.length )
				if( unit.pluralTokens.every( ( t, i ) => t === tokens[i] ) )
					return true

			return false
		}

		addCommand({
			aliases: 'units',
			description: 'returns list of all available units for converter',
			callback: ({ session }) => session.update( Embed()
				.setTitle( "Available units" )
				.addFields( systems
					.map( ( units, system ) => ({
						name: system,
						value: '• ' + units
							.map( unit => `\`${unit.plural} (${unit.short})\`` )
							.join( ', ' ),
					}))
				)
				.addFields([{
					name: `Usage`,
					value: `• \`[<number>] <unit1> to <unit2>\`.`,
				}])
			),
		})

		MM.pushHandler( 'unit-converter', false, msg => {
			const session = msg.response.session
			const iter = msg.content.matchAll( RE )

			const convertedValues = Array
				.from( iter )
				.map( ([, valueString, from, to]) => {
					const value = Number( valueString || 1 )
					const fromTokens = from.toLowerCase().split( /\s+/ )
					const toTokens = to.toLowerCase().split( /\s+/ )

					return systems.map( units => {
						const fromUnit = units.find( u => unitHasToken( u, fromTokens ) )
						if( !fromUnit )
							return

						const toUnit = units.find( u => unitHasToken( u, toTokens ) )
						if( !toUnit )
							return

						const convertedValue = value / fromUnit.value * toUnit.value

						const fromValue = numsplit( prettyRound( value, 3 ) )
						const fromUnitName = value === 1 ? fromUnit.single : fromUnit.plural
						const toValue = numsplit( prettyRound( convertedValue, 3 ) )
						const toUnitName = convertedValue === 1 ? toUnit.single : toUnit.plural

						return `${fromValue} ${fromUnitName} is ${toValue} ${toUnitName}`
					})
				})
				.flat(1)
				.filter( cv => !!cv )
				.join( '\n' )

			if( convertedValues )
				session.update( convertedValues )
		})
	}
}

// N of X/Y to Z/W
// (N * X / Y) / (Z / W)
// N * X / Z / Y * W

/*
Multiples_and_Submultiples_of_SI_units = [
	Prefix	Symbol	Multiplying	Factor
	exa		E		1e18		1 000 000 000 000 000 000
	peta 	P		1e15		1 000 000 000 000 000
	tera 	T		1e12		1 000 000 000 000
	giga 	G		1e9			1 000 000 000
	mega 	M		1e6			1 000 000
	kilo 	k		1e3			1 000
	hecto*	h		1e2 		100
	deca*	da		1e1			10
	null	null	1			1
	deci*	d		1e-1		0.1
	centi	c		1e-2		0.01
	milli	m		1e-3		0.001
	micro	u		1e-6		0.000 001
	nano	n		1e-9		0.000 000 001
	pico	p		1e-12		0.000 000 000 001
	femto	f		1e-15		0.000 000 000 000 001
	atto	a		1e-18		0.000 000 000 000 000 001
]
*/

/*
density = [
	Gram/milliliter
	Kilogram/meter cube
	Pound/foot cube
	Pound/inch cube

	g/ml
	kg/m3
	lb/ft3
	lb/in3

	1
	1000
	62.42197
	0.036127
	0.001
	1
	0.062422
	0.000036
]
*/