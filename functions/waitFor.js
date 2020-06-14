module.exports = {
    requirements: 'unshiftMessageHandler',
    execute: ( requirements, mao ) => {
		requirements.define( global )
		
		var waitForMembersResponse = []
		let nearestTimeout = 0

		function validFunc( func ){
			return typeof func === 'function' ? func : () => {}
		}
		
		function waitFor( options ){
			let memberID = options.memberID

			if( waitForMembersResponse[memberID] ){
				let response = waitForMembersResponse[memberID]

				if( response.onOverwrite )
					response.onOverwrite()
				if( response.message )
					response.message.edit( 'Canceled' )
					.then( m => m.delete( response.messageDeleteDelay ) )

				delete waitForMembersResponse[memberID]
			}

			waitForMembersResponse[memberID] = {
				stopWaiting: () => delete waitForMembersResponse[memberID],
				onMessage: validFunc( options.onMessage ),
				onTimeout: validFunc( options.onTimeout ),
				onOverwrite: validFunc( options.onOverwrite ),
				timeout: Date.now() + options.timeout * 1000, // in seconds
				message: typeof options.message === 'object' && options.message !== null && options.message.constructor.name === 'Message' ? options.message : null,
				messageDeleteDelay: Number( options.messageDeleteDelay ) > 0 ? Number( options.messageDeleteDelay ) * 1e3 : 1337,
			}
		}
		mao.waitFor = waitFor

		setInterval( () => {
			if( waitForMembersResponse.length === 0 ) return;
			
			if( nearestTimeout < Date.now() ){
				nearestTimeout = -1

				for( let k in waitForMembersResponse ){
					let response = waitForMembersResponse[k]

					if( response.timeout < Date.now() ){
						if( response.onTimeout )
							response.onTimeout()
						if( response.message )
							response.message.edit( 'Timed out' )
							.then( m => m.delete( response.messageDeleteDelay ) )
						
						delete waitForMembersResponse[k]
						continue
					}

					if( nearestTimeout === -1 || nearestTimeout > response.timeout )
						nearestTimeout = response.timeout
				}
			}
		}, 500 )

		setTimeout( () => { // bruh
			unshiftMessageHandler( 'waitFor', async msg => {
				let response = waitForMembersResponse[msg.member.id]
				if( response ) return await response.onMessage( msg, response.stopWaiting )
			})
		}, 123 )
	}
}