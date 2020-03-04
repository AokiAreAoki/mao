module.exports = {
	requirements: '',
	execute: ( requirements, mao ) => {
		requirements.define( requirements, global )
		var mdata = {}, m = {}
		
		function addOption( command, description, callback ){
			let aliases = command.split( /\s+/ )
			let cmd = aliases.shift()
			
			m[cmd] = {
				aliases: aliases,
				description: description,
				func: callback,
			}
		
			if( aliases.length > 0 )
				aliases.forEach( alias => m[alias] = cmd )
		}
		
		addOption( 'join j', 'joins your voice channel', ( msg, args, string_args ) => {
			if( msg.member.voice )
				if( !msg.guild.voice || msg.guild.voice.channelID != msg.member.voice.channelID ){
					let vc = msg.member.voice.channel
					vc.join()
					msg.channel.send( 'Joined ' + vc.name )
				}
			else
				msg.channel.send( 'Connect to the voice channel first, baka~!' )
		})

		let full = 'TODO'
		addCmd( 'music m', { short: 'Plays music from youtube', full: full }, ( msg, args, string_args ) => {
			let option = args[0]

			if( m[option] ){
				string_args = string_args.substring( option.length ).trim()
				
				// Aliases Redirection
				if( typeof m[option] == 'string' )
					option = m[option]
				option = m[option]
	
				if( typeof option.func == 'function' )
					option.func( msg, args, get_string_args )
				else
					log( `Error: m.${option}.func is a ${typeof option.func}, function expected` )
			}
		})
	}
}