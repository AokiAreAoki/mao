module.exports = {
	requirements: 'unshiftMessageHandler',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		var waiters = { length: 0 }
		let nearestTimeout = 0
		let validFunc = func => typeof func === 'function' ? func : () => {}
		let isWaiter = waiter => waiter && waiter.isWaiter

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
				let response = waiters[memberID]

				if( response.onOverwrite )
					response.onOverwrite()

				if( response.message !== null )
					response.message.edit( 'Canceled' )
						.then( m => m.delete( response.messageDeleteDelay ) )

				delete waiters[memberID]
			}

			addWaiter( memberID, options )
		}
		
		mao.waitFor = waitFor
		mao.waiters = waiters

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
									
							if( response.message !== null )
								response.message.edit( 'Timed out' )
									.then( m => m.delete( response.messageDeleteDelay ) )
								
							deleteWaiter(k)
						} else if( nearestTimeout > waiter.timeout || nearestTimeout === -1 )
							nearestTimeout = waiter.timeout
					}
				}
			}
		}, 500 )

		setTimeout( () => { // bruh
			unshiftMessageHandler( 'waitFor', async msg => {
				if( msg.member ){
					let response = waiters[msg.member.id]
					if( response )
						return await response.onMessage( msg, () => { response.stopWaiting() } )
				}
			})
		}, 123 )
	}
}