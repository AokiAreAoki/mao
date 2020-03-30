
var n = value => typeof value == 'number' && !isNaN( value ) && Math.abs( value ) != Infinity
var v = value => typeof value == 'object' && value !== null && value.constructor == Vector

function clamp( num, min, max ){
	return Math.max( Math.min( num, max ), min )
}

function vec( x, y, z, w ){
	return new Vector( x, y, z, w )
}

let FunctionsForVM = {
	isVector: v,
	calc: () => {
		// soon // maybe
	},
	add: () => {
		let v = vec()

		for( let k in arguments )
			v.add( arguments[k] )

		return v
	},
	sub: () => {
		let v = vec()

		for( let k in arguments )
			v.sub( arguments[k] )

		return v
	},
	mul: () => {
		let v = vec()

		for( let k in arguments )
			v.mul( arguments[k] )

		return v
	},
	div: () => {
		let v = vec()

		for( let k in arguments )
			v.div( arguments[k] )

		return v
	},
	pow: () => {
		let v = vec()

		for( let k in arguments )
			v.pow( arguments[k] )

		return v
	},
	minVector: () => {
		let v = arguments[0].copy()

		for( let k = 1; k < arguments.length; k++ )
			v.minVector( arguments[k] )

		return v
	},
	maxVector: () => {
		let v = arguments[0].copy()

		for( let k = 1; k < arguments.length; k++ )
			v.maxVector( arguments[k] )

		return v
	},
	fromHex: hex => {
	    let array = []
	    
	    while( hex > 0 && array.length < 4 ){
	        array.push( hex % 256 )
	        hex = Math.floor( hex / 256 )
	    }
	    
	    return vec.fromArray( array.reverse() )
	},
	fromArray: array => {
		let v = vec()
		
		for( let i = 0; i < 4; ++i )
			if( typeof array[i] == 'number' )
				v[ 'xyzw'[i] ] = array[i]
		
		return v
	},
	fromTable: table => {
		let v = vec()
		
		for( let i = 0; i < 4; ++i ){
			let axis = 'xyzw'[i]
			if( typeof table[axis] == 'number' )
				v[axis] = table[axis]
		}
		
		return v
	},
}

for( let k in FunctionsForVM ){
	vec[k] = FunctionsForVM[k]
}

class Vector {
	constructor( x, y, z, w ){
		this.isVector = true
		let axes = 2

		Object.defineProperty( this, 'axes', {
			get: () => axes,
			set: value => { axes = Math.round( clamp( value, 2, 4 ) ) },
		})

		for( let i = 0; i < 4; ++i ){
			let ax = 'xyzw'[i]
			let axis = arguments[i]

			Object.defineProperty( this, ax, {
				get: () => axis,
				set: value => {
					if( this.axes < i + 1 ) this.axes = i + 1
					axis = n( value ) ? value : 0
				},
			})

			this[ax] = axis
		}

		if( n(z) )
			if( n(w) ) this.axes = 4
			else this.axes = 3
		else
			this.axes = 2
	}
	
	forEach( axes, cb ){
		if( typeof axes == 'function' ){
			cb = axes
			axes = false
		}

		for( let i = 0; i < this.axes; ++i ){
			if( axes && axes.search( 'xyzw'[i] ) === -1 ) continue
			if( cb( this[ 'xyzw'[i] ], 'xyzw'[i], i ) === true ) break
			// callback( value of axis, name of axis, number of axis )
		}

		return this
	}

	equals( vector ){
		if( this.axes !== vector.axes ) return false

		let result = true
		this.forEach( ( v, axis ) => {
			if( v != vector[axis] ){
				result = false
				return true
			}
		})

		return result
	}

	/// Changes This Vector ///

	add( vector ){
		if( v( vector ) ){
			let axes = Math.min( this.axes, vector.axes )

			for( let i = 0; i < axes; ++i )
				this[ 'xyzw'[i] ] += vector[ 'xyzw'[i] ]

			return this
		} else if( n( vector ) ){
			for( let i = 0; i < this.axes; ++i )
				this[ 'xyzw'[i] ] += vector

			return this
		}

		throw new Error( 'Argiment #1 must be a vector or number' )
	}
	
	sub( vector ){
		if( v( vector ) ){
			let axes = Math.min( this.axes, vector.axes )

			for( let i = 0; i < axes; ++i )
				this[ 'xyzw'[i] ] -= vector[ 'xyzw'[i] ]

			return this
		} else if( n( vector ) ){
			for( let i = 0; i < this.axes; ++i )
				this[ 'xyzw'[i] ] -= vector

			return this
		}

		throw new Error( 'Argiment #1 must be a vector or number' )
	}
	
	mul( vector ){
		if( v( vector ) ){
			let axes = Math.min( this.axes, vector.axes )

			for( let i = 0; i < axes; ++i )
				this[ 'xyzw'[i] ] *= vector[ 'xyzw'[i] ]

			return this
		} else if( n( vector ) ){
			for( let i = 0; i < this.axes; ++i )
				this[ 'xyzw'[i] ] *= vector

			return this
		}

		throw new Error( 'Argiment #1 must be a vector or number' )
	}
	
	div( vector ){
		if( v( vector ) ){
			let axes = Math.min( this.axes, vector.axes )

			for( let i = 0; i < axes; ++i )
				this[ 'xyzw'[i] ] /= vector[ 'xyzw'[i] ]

			return this
		} else if( n( vector ) ){
			for( let i = 0; i < this.axes; ++i ){
				this[ 'xyzw'[i] ] /= vector
			}

			return this
		}

		throw new Error( 'Argiment #1 must be a vector or number' )
	}

	pow( vector ){
		if( v( vector ) ){
			let axes = Math.min( this.axes, vector.axes )

			for( let i = 0; i < axes; ++i )
				this[ 'xyzw'[i] ] **= vector[ 'xyzw'[i] ]

			return this
		} else if( n( vector ) ){
			for( let i = 0; i < this.axes; ++i ){
				this[ 'xyzw'[i] ] **= vector
			}

			return this
		}

		throw new Error( 'Argiment #1 must be a vector or number' )
	}

	sqrt( axes ){
		this.forEach( axes, ( value, axis ) => {
			this[axis] = Math.sqrt( value )
		})

		return this
	}

	minVector( vector ){
		let axes = Math.min( this.axes, vector.axes )

		for( let i = 0; i < axes; ++i )
			this[ 'xyzw'[i] ] = Math.min( this[ 'xyzw'[i] ], vector[ 'xyzw'[i] ] )

		return this
	}

	maxVector( vector ){
		let axes = Math.min( this.axes, vector.axes )

		for( let i = 0; i < axes; ++i )
			this[ 'xyzw'[i] ] = Math.max( this[ 'xyzw'[i] ], vector[ 'xyzw'[i] ] )

		return this
	}

	abs( axes, inverted=false ){
		if( typeof axes == 'boolean' ){
			inverted = axes
			axes = false
		}

		this.forEach( axes, ( value, axis ) => this[axis] = Math.abs( value ) * ( inverted ? -1 : 1 ) )
		return this
	}

	invert( axes ){
		return this.forEach( axes, ( value, axis ) => this[axis] = -value )
	}

	normalize(){
		return this.div( this.scalar() )
	}

	rotate( ang, useDegrees=false ){
		//if( Math.abs( ang ) % 360 == 180 ) return this.invert()

		ang += this.ang( useDegrees )
		let len = this.scalar()
		let k = useDegrees ? 180 / Math.PI : 1

		this.x = Math.sin( ang * k ) * len
		this.y = Math.cos( ang * k ) * len

		return this
	}
	
	remixAxes( axes ){
		axes = axes.toLowerCase().replace( /[^xyzw]/, '' )
		let copy = this.copy()
		
		for( let i = 0; i < Math.min( axes.length, 4 ); ++i )
			this[ 'xyzw'[i] ] = copy[ axes[i] ]
		
		return this
	}

	/// Returns New Vector ///

	copy( axes ){
		var copy = vec()
		
		this.forEach( axes, ( value, axis ) => {
			copy[axis] = value
		})

		return copy
	}

	/// Returns Number ///

	min( axes ){
		let axis = null

		this.forEach( axes, ax => {
			if( axis === null || axis > ax ) axis = ax
		})

		return axis
	}

	max( axes ){
		let axis = null

		this.forEach( axes, ax => {
			if( axis === null || axis < ax ) axis = ax
		})

		return axis
	}

	average( axes ){
		let total = 0
		let amount = 0

		this.forEach( axes, ax => {
			total += ax
			amount++
		})

		return total / amount
	}

	scalar( axes ){
		let scalar = 0
		this.forEach( axes, axis => { scalar += axis ** 2 } )
		return Math.sqrt( scalar )
	}

	angFromNormal( doReturnDegrees=false ){
		let a = Math.acos( this.y ) * ( doReturnDegrees ? 180 / Math.PI : 1 )
    	return Math.asin( this.x ) < 0 ? ( doReturnDegrees ? 360 : Math.PI * 2 ) - a : a
	}

	ang( doReturnDegrees ){
		return this.copy().normalize().angFromNormal( doReturnDegrees )
	}
	
	toHex(){
	    let hex = 0
	    this.forEach( v => hex = hex * 256 + v )
	    return hex
	}

	/// toString ///

	toString( axes, showAxes=false ){
		let vector = '['

		this.forEach( axes, ( value, axis, number ) => {
			let f = number == 0
			vector += ( f ? '' : '; ' ) + ( showAxes ? `${( f ? '' : ' ' ) + axis} = ` : '' ) + String( value )
		})

		return vector + ']'
	}
}

module.exports = vec