
function expect( number, argument, expected ){
	if( typeof argument != expected )
		throw new Error( `TypeError: bad argument #${number} (${expected} expected, got ${typeof argument})` );
}

class timer {
	static timers = {}
	
	static simple( timeout, func ){
		setTimeout( func, timeout * 1e3 )
	}
	
	static create( name, interval, repeats, func ){
		expect( 1, name, 'string' )
		expect( 2, interval, 'number' )
		expect( 3, repeats, 'number' )
		expect( 4, func, 'function' )
		
		repeats = Math.floor( repeats )
		const repeating = repeats > 0
		
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
	
	static remove( name ){
		if( this.timers[name] ){
			clearInterval( this.timers[name] )
			delete this.timers[name]
			return true
		}
		
		return false
	}
	
	static removeAll(){
		this.timers.forEach( timer => clearInterval( timer ) )
		delete this.timers
		this.timers = {}
	}
	
	static exists( name ){
		return this.timers[name] != undefined
	}
}

module.exports = timer
