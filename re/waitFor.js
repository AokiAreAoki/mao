
var waiters = { length: 0 }
var nearestTimeout = 0

const validFunc = func => typeof func === 'function' ? func : () => {}
const isWaiter = waiter => waiter && waiter.isWaiter

class Waiter {
	constructor( memberID, options ){
		this.memberID = memberID
		this.onMessage = validFunc( options.onMessage )
		this.onTimeout = validFunc( options.onTimeout )
		this.onOverwrite = validFunc( options.onOverwrite )
		this.timeout = Date.now() + options.timeout * 1000 // in seconda
		this.message = typeof options.message === 'object' && options.message !== null && options.message.constructor.name === 'Message' ? options.message : null
		this.messageDeleteDelay = Number( options.messageDeleteDelay ) > 0 ? Number( options.messageDeleteDelay ) * 1e3 : 1337
		this.isWaiter = true

		if( isWaiter( waiters[memberID] ) )
			deleteWaiter( memberID )

		waiters[memberID] = this
		++waiters.length

		nearestTimeout = Math.min( nearestTimeout, this.timeout )
	}

	stopWaiting(){
		deleteWaiter( this.memberID )
	}
	
	cancel(){
		if( this.onTimeout )
			this.onTimeout()
		
		if( this.message !== null )
			this.message.edit( 'Canceled' )
				.then( m => m.delete( this.messageDeleteDelay ) )
		
		this.stopWaiting()
	}
}

function addWaiter( memberID, options ){
	new Waiter( memberID, options )
}

function deleteWaiter( id ){
	if( isWaiter( waiters[id] ) ){
		delete waiters[id]
		--waiters.length
		return true
	}

	return false
}

function waitFor( options ){
	let memberID = options.memberID

	if( waiters[memberID] ){
		let waiter = waiters[memberID]

		if( waiter.onOverwrite )
			waiter.onOverwrite()

		if( waiter.message !== null )
			waiter.message.edit( 'Canceled' )
				.then( m => m.delete( waiter.messageDeleteDelay ) )

		delete waiters[memberID]
	}

	addWaiter( memberID, options )
}

setInterval( () => {
	if( waiters.length === 0 ) return
	let now = Date.now()

	if( nearestTimeout < now ){
		nearestTimeout = -1

		for( let k in waiters ){
			let waiter = waiters[k]

			if( isWaiter( waiter ) ){
				if( waiter.timeout < now ){
					if( waiter.onTimeout )
						waiter.onTimeout()
							
					if( waiter.message !== null )
						waiter.message.edit( 'Timed out' )
							.then( m => m.delete( waiter.messageDeleteDelay ) )
						
					deleteWaiter(k)
				} else if( nearestTimeout > waiter.timeout || nearestTimeout === -1 )
					nearestTimeout = waiter.timeout
			}
		}
	}
}, 500 )

waitFor.waiters = waiters
waitFor.handler = async msg => {
	if( msg.member ){
		let waiter = waiters[msg.member.id]
		if( waiter )
			return await waiter.onMessage( msg, () => { waiter.stopWaiting() } )
	}
}

module.exports = waitFor