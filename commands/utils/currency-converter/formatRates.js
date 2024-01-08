// eslint-disable-next-line no-global-assign
require = global.alias(require)

const client = require( '@/instances/client' )
const { Events } = require('discord.js')

const QUESTIONS = [
	`Are you silly?`,
	`You will not believe the result...`,
	`Shit, I don't know`,
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
		return `Try different currency`
	}

	rates = rates.map( rate => rate.value )

	return Array
		.from( new Set( rates ) )
		.join( '\n' )
}