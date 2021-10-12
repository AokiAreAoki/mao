module.exports = {
	requirements: 'updateConfig',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'update-config updatecfg',
			description: `reloads config`,
			callback: async msg => {
				try {
					updateConfig()
					await msg.send( 'Config reloaded' )
				} catch( err ){
					msg.sendcb( err )
				}
			}
		})
	}
}