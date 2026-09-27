// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const Embed = require( '@/utils/Embed' )
		const serviceManager = require( '@/instances/service-manager' )
		const StatusLine = require( './StatusLine' )

		const cmd = addCommand({
			aliases: 'service services srv',
			description: 'manages services',
		})

		cmd.addSubcommand({
			aliases: 'list ls',
			description: 'lists all registered services',
			async callback({ session }){
				const alwaysOnServices = []
				const enabledServices = []
				const disabledServices = []
				const failedServices = []
				const deadDBEntries = serviceManager.findDeadStorageEntries()

				for( const service of serviceManager.services.values() ){
					if( service.hasFailed )
						failedServices.push( service )

					if( service.alwaysOn )
						alwaysOnServices.push( service )
					else if( service.isEnabled )
						enabledServices.push( service )
					else
						disabledServices.push( service )
				}

				function getServiceStatus( service ){
					return service.hasFailed
						? '❌'
						: ( service.isLaunched ? '🟢' : '⚫' )
				}

				function formatService( service, infoFn = null ){
					let line = `- ${getServiceStatus( service )} \`${service.id}\``

					if( infoFn )
						line += ` - ${infoFn( service )}`

					return line
				}

				function formatServices( services, infoFn = null ){
					return services
						.map( service => formatService( service, infoFn ) )
						.join( '\n' )
				}

				const servicesEmbed = Embed()
					.setTitle( `Services: (${serviceManager.services.size})`)
					.addFields(
						{
							name: `🔒 Always On Services (${alwaysOnServices.length})`,
							value: formatServices( alwaysOnServices ),
						},
						{
							name: `✅ Auto-Enabled Services (${enabledServices.length})`,
							value: formatServices( enabledServices ),
						},
						{
							name: `⬛ Other Services (${disabledServices.length})`,
							value: formatServices( disabledServices ),
						},
					)

				const failedEmbed = failedServices.length > 0 && Embed()
					.setTitle( `Failed Services: (${failedServices.length})`)
					.setDescription( formatServices( failedServices, s => `failed to initialize: ${s.error?.message || s.error}` ) )

				const deadDBEntriesEmbed = deadDBEntries.length !== 0 && Embed()
					.setColor( 0x121212 )
					.setTitle( `Dead Database Entries: (${deadDBEntries.length})`)
					.setDescription( deadDBEntries.map( id => `- \`${id}\`` ).join( '\n' ) )

				return session.update({
					embeds: [
						servicesEmbed,
						failedEmbed,
						deadDBEntriesEmbed,
					].filter( Boolean )
				})
			},
		})

		async function startService( id, session ){
			const service = serviceManager.services.get( id )

			if( !service )
				return session.update( `\`${id}\` service ID not found.` )

			if( service.isLaunched )
				return session.update( `Service \`${service.name}\` (\`${service.id}\`) is already running.` )

			let initStatus = new StatusLine( 'init' )
			let startStatus = new StatusLine( 'start' )

			async function updateStatus(){
				return session.update([
					`\`${service.name}\` (\`${service.id}\`) service`,
					'- ' + initStatus,
					'- ' + startStatus,
				].join( '\n' ))
			}

			if( service.hasInitialized ){
				initStatus.setStatus( 'already' )
				updateStatus()
			} else {
				initStatus.setStatus( 'pending' )
				updateStatus()

				const { succeeded, error } = await service.initialize()

				if( succeeded ){
					initStatus.setStatus( 'success' )
					updateStatus()
				} else {
					initStatus.setStatus( 'fail' )
					initStatus.setError( error )
					startStatus.setStatus( 'idle' )
					return updateStatus()
				}
			}

			try {
				const success = await service.start()

				if( success ){
					startStatus.setStatus( 'success' )
					return updateStatus()
				} else {
					startStatus.setStatus( 'already' )
					return updateStatus()
				}
			} catch(_){
				startStatus.setStatus( 'fail' )
				startStatus.setError( service.error )
				return updateStatus()
			}
		}

		async function stopService( id, session ){
			const service = serviceManager.services.get( id )

			if( !service )
				return session.update( `\`${id}\` service ID not found.` )

			if( service.alwaysOn )
				return session.update( `Service \`${service.name}\` (\`${service.id}\`) is always-on and cannot be stopped.` )

			if( !service.isLaunched )
				return session.update( `Service \`${service.name}\` (\`${service.id}\`) is not running.` )

			let stopStatus = new StatusLine( 'stop' )

			async function updateStatus(){
				return session.update([
					`\`${service.name}\` (\`${service.id}\`) service`,
					'- ' + stopStatus,
				].join( '\n' ))
			}

			stopStatus.setStatus( 'pending' )
			updateStatus()

			try {
				const success = await service.stop()

				if( success ){
					stopStatus.setStatus( 'success' )
					return updateStatus()
				} else {
					stopStatus.setStatus( 'already' )
					return updateStatus()
				}
			} catch(_){
				stopStatus.setStatus( 'fail' )
				stopStatus.setError( service.error )
				return updateStatus()
			}
		}

		cmd.addSubcommand({
			aliases: 'start',
			description: {
				single: 'starts a service',
				usages: [
					['<service_id>', 'starts the specified service'],
				],
			},
			async callback({ args, session }){
				const id = args[0]?.toLowerCase()

				if( !id )
					return session.update( this.help )

				startService( id, session )
			},
		})

		cmd.addSubcommand({
			aliases: 'stop',
			description: {
				single: 'stops a service',
				usages: [
					['<service_id>', 'stops the specified service'],
				],
			},
			async callback({ args, session }){
				const id = args[0]?.toLowerCase()

				if( !id )
					return session.update( this.help )

				stopService( id, session )
			},
		})

		cmd.addSubcommand({
			aliases: 'toggle',
			description: {
				single: 'toggles a service enabled/disabled state',
				usages: [
					['<service_id>', 'toggles the specified service'],
				],
			},
			async callback({ args, session }){
				const id = args[0]?.toLowerCase()

				if( !id )
					return session.update( this.help )

				const service = serviceManager.services.get( id )

				if( !service )
					return session.update( `\`${id}\` service ID not found.` )

				if( service.isLaunched )
					stopService( id, session )
				else
					startService( id, session )
			},
		})
	}
}
