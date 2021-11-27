let tu = {}
tu.miliseconds = 1
tu.seconds = 1000 * tu.miliseconds
tu.minutes = 60 * tu.seconds
tu.hours = 60 * tu.minutes
tu.days = 24 * tu.hours
tu.weeks = 7 * tu.days
tu.months = tu.weeks * 30 / 7
tu.years = tu.months * 365.25 / 30

let singularForm = { // useless ig
	miliseconds: 'milisecond',
	seconds: 'second',
	minutes: 'minute',
	hours: 'hour',
	days: 'day',
	weeks: 'week',
	months: 'month',
	years: 'year',
}

function isValidNumber( number ){
	return typeof number === 'number' && !isNaN( number ) && Math.abs( number ) !== Infinity
}

function plural( number ){
	return number == 1 ? '' : 's'
}

class TimeSplitter {
	static tu = tu
	static singularForm = singularForm
	
	constructor( time = {} ){
		this.timestamp = 0
		this.tu = []
		
		for( let u in tu ){
			this[u] = 0
			this.tu.push(u)
			
			if( isValidNumber( time[u] ) )
				this.timestamp += time[u] * tu[u]
		}
				
		this.fromMS()
	}
	
	fromMS( ms = this.timestamp ){
		for( let i = this.tu.length - 1; i >= 0; --i ){
			let u = this.tu[i]
			this[u] = Math.floor( ms / tu[u] )
			ms -= this[u] * tu[u]
			//console.log(this[u])
		}
	}
	
	static fromMS( miliseconds = Date.now() ){
		return new TimeSplitter({ miliseconds })
	}
	
	static convert( value, unitFrom, unitTo ){
		return value / tu[unitTo] * tu[unitFrom]
	}
	
	toString({
		separator = '\n',
		ignoreZeros = false,
		ascOrder = false,
		formatter = ( value, unit ) => `${value} ${unit}`,
		maxTU = -1,
	} = {} ){
		const units = []
		let tu = Object.keys( TimeSplitter.tu )

		if( !ascOrder )
			tu = tu.reverse()

		for( const u of tu ){
			if( !ignoreZeros || this[u] !== 0 )
				units.push( formatter( this[u], this[u] === 1 ? singularForm[u] : u ) )

			if( maxTU > 0 && units.length !== 0 && --maxTU === 0 )
                                break
		}

		return units.join( separator || '\n' )
	}
}

module.exports = TimeSplitter
