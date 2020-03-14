module.exports = {
    requirements: 'addMessageHandler',
    execute: ( requirements, mao ) => {
		requirements.define( global )
		
		var waitForMembersResponse = []
		let nearestTimeout = 0

		function waitFor( memberID, timeout_InSeconds, callbacks ){
			if( waitForMembersResponse[memberID] ){
				waitForMembersResponse[memberID].onOverwrite()
				delete waitForMembersResponse[memberID]
			}

			waitForMembersResponse[memberID] = {
				stopWaiting: () => delete waitForMembersResponse[memberID],
				onMessage: callbacks.onMessage,
				onTimeout: callbacks.onTimeout,
				onOverwrite: callbacks.onOverwrite,
				timeout: Date.now() + timeout_InSeconds * 1000,
			}
		}
		mao.waitFor = waitFor

		setInterval( () => {
			if( waitForMembersResponse.length == 0 ) return;
			
			if( nearestTimeout < Date.now() ){
				nearestTimeout = -1

				for( let k in waitForMembersResponse ){
					let respone = waitForMembersResponse[k]

					if( respone.timeout < Date.now() ){
						if( respone.onTimeout ) respone.onTimeout()
						delete waitForMembersResponse[k]
						continue
					}

					if( nearestTimeout == -1 || nearestTimeout > response.timeout )
						nearestTimeout = response.timeout
				}
			}
		}, 500 )

		addMessageHandler( async msg => {
			if( waitForMembersResponse[msg.member.id] ){
				let response = waitForMembersResponse[msg.member.id]
				if( await response.onMessage( msg, response.stopWaiting ) ) return true
			}
		})
	}
}