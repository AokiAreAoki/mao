module.exports = {
	requirements: 'embed',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd( 'hextorgb htr', { full: 'Converts HEX to RGB', short: 'yes' }, ( msg, args ) => {
			let hex = args[0].toUpperCase().replace( /0x/i, '' ).replace( '#', '' )
			
			let r = Number( `0x${ hex.substring( 0, 2 ) }` ),
				g = Number( `0x${ hex.substring( 2, 4 ) }` ),
				b = Number( `0x${ hex.substring( 4, 6 ) }` )
			
			msg.send( embed()
				.setDescription( `**${r}, ${g}, ${b}**` )
				.setColor( `0x${hex}` )
			)
		})
	}
}