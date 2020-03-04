
function expect( number, argument, expected ){
	if( typeof argument != expected )
		throw new Error( `TypeError: bad argument #${number} (${expected} expected, got ${typeof argument})` );
}

class timer {
	constructor(){
		this.timers = {}
	}

	simple( timeout, func ){ //  :\
		setTimeout( func, timeout * 1e3 )
	}
	
	create( name, interval, repeats, func ){
		expect( 1, name, 'string' )
		expect( 2, interval, 'number' )
		expect( 3, repeats, 'number' )
		expect( 4, func, 'function' )
		
		repeats = Math.floor( repeats )
		let repeating = repeats > 0
		
		if( this.timers[name] )
			clearInterval( this.timers[name] );

		this.timers[name] = setInterval( () => {
			( async () => func() )()
			
			if( repeating && repeats > 0 ){
				--repeats
				
				if( repeats <= 0 )
					this.remove( name );
			}
		}, interval * 1e3 )
	}
	
	remove( name ){
		if( this.timers[name] ){
			clearInterval( this.timers[name] )
			delete this.timers[name]
			return true
		} else
			return false
	}
	
	removeAll(){
		this.timers.forEach( timer => clearInterval( timer ) )
		delete this.timers
		this.timers = {}
	}
	
	exists( name ){
		return !!this.timers[name]
	}
}

exports = module.exports = new timer()