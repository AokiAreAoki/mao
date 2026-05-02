let tu = {}
tu.milliseconds = 1
tu.seconds = 1000 * tu.milliseconds
tu.minutes = 60 * tu.seconds
tu.hours = 60 * tu.minutes
tu.days = 24 * tu.hours
tu.weeks = 7 * tu.days
tu.months = tu.weeks * 30 / 7
tu.years = tu.months * 365.25 / 30

const singularForm = {
	milliseconds: 'millisecond',
	seconds: 'second',
	minutes: 'minute',
	hours: 'hour',
	days: 'day',
	weeks: 'week',
	months: 'month',
	years: 'year',
}

const shortForm = {
	ms: 'milliseconds',
	s: 'seconds',
	m: 'minutes',
	h: 'hours',
	d: 'days',
	w: 'weeks',
	mn: 'months',
	y: 'years',
}

function isValidNumber( number ){
	return typeof number === 'number' && !isNaN( number ) && Math.abs( number ) !== Infinity
}

class TimeSplitter {
	static tu = tu
	static singularForm = singularForm
	static shortForm = shortForm

	constructor( time = {} ){
		this.tu = []
		this.timestamp = typeof time === 'string'
			? TimeSplitter.parseTime( time )
			: 0

		for( let u in tu ){
			this[u] = 0
			this.tu.push(u)
		}

		if( typeof time === 'object' )
			for( let u in tu )
				if( isValidNumber( time[u] ) )
					this.timestamp += time[u] * tu[u]

		this.fromMS()
	}

	fromMS( ms = this.timestamp ){
		for( let i = this.tu.length - 1; i >= 0; --i ){
			let u = this.tu[i]
			this[u] = Math.floor( ms / tu[u] )
			ms -= this[u] * tu[u]
		}
	}

	static fromMS( milliseconds = Date.now() ){
		return new TimeSplitter({ milliseconds })
	}

	static convert( value, unitFrom, unitTo ){
		return value / tu[unitTo] * tu[unitFrom]
	}

	static parseTime( string ){
		const iter = string.matchAll( /(-?\d+(?:[.,]\d+)?(?:e\d+)?)\s*([a-z]+)/gi )
		let timestamp = 0

		for( let [, value, unit] of iter ){
			if( !tu[unit] )
				unit = TimeSplitter.shortForm[unit] ?? Object.keys( tu ).find( u => u.startsWith( unit ) )

			if( !tu[unit] )
				continue

			timestamp += Number( value ) * tu[unit]
		}

		return timestamp
	}

	toString({
		separator = '\n',
		ignoreZeros = false,
		ascOrder = false,
		formatter = ( value, _, unit ) => `${value} ${unit}`,
		maxTU = -1,
		and = null,
	} = {} ){
		const units = []
		let tu = Object.keys( TimeSplitter.tu )

		if( !ascOrder )
			tu = tu.reverse()

		for( const u of tu ){
			if( ignoreZeros && this[u] === 0 )
				continue

			const single = TimeSplitter.singularForm[u]
			units.push( formatter( this[u], single, this[u] === 1 ? single : u ) )

			if( maxTU > 0 && units.length !== 0 && --maxTU === 0 )
				break
		}

		if( and === true )
			and = ' and '

		if( typeof and === 'string' && units.length > 1 )
			and += units.pop()
		else
			and = ''

		return units.join( separator ?? '\n' ) + and
	}
}

module.exports = TimeSplitter
