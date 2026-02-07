// eslint-disable-next-line no-global-assign
require = global.alias(require)

const { Events } = require( 'discord.js' )
const client = require( '@/instances/client' )
const numsplit = require( '@/functions/numsplit' )
const prettyRound = require( '@/functions/prettyRound' )

const QUESTIONS = [
	`Are you silly?`,
	`You will not believe the result...`,
	`Shit, I don't know`,
]

const SAME_CURRENCIES_RESPONSE = [
	`Try different currencies`,
	`There are the same currencies`,
	`I bet it's the same`,
]

client.once( Events.ClientReady, () => {
	const emoji = client.emojis.resolve( `717358214185746543` )

	if( emoji )
		QUESTIONS.push( emoji )
})

module.exports = function formatRates( rates ){
	if( rates.every( rate => rate.isZero ) ){
		const index = Math.floor( Math.random() * QUESTIONS.length )
		return QUESTIONS[index]
	}

	if( rates.every( rate => rate.isSameCurrency ) ){
		const index = Math.floor( Math.random() * SAME_CURRENCIES_RESPONSE.length )
		return SAME_CURRENCIES_RESPONSE[index]
	}

	const groups = new Map()
	const strings = []

	for( const rate of rates ){
		const input = `${numsplit( rate.valueFrom )} ${rate.currencyFrom}`

		let group = groups.get( input )

		if( !group ){
			group = []
			groups.set( input, group )
		}

		group.push( rate )
	}

	for( const [input, rates] of groups.entries() ){
		if( rates.length === 0 ){
			continue
		}

		if( rates.length === 1 ){
			const rate = rates[0]
			strings.push( `${input} is ${numsplit( prettyRound( rate.valueTo ) )} ${rate.currencyTo}` )
			continue
		}

		const outputs = rates.map( rate => {
			let output = `${numsplit( prettyRound( rate.valueTo ) )} ${rate.currencyTo}`

			if( rate.isSameCurrency )
				output = `~~${output}~~`

			return `- ${output}`
		})

		const string = `${input} is:\n` + Array
			.from( new Set( outputs ) )
			.join( '\n' )

		strings.push( string )
	}

	return strings.join( '\n' )
}