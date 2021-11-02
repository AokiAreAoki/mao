module.exports = {
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		addCmd({
			aliases: 'hextorgb htr',
			description: {
				single: 'converts HEX to RGB',
				usages: [
					['<hex>', 'converts $1 to RGB'],
				],
				examples: [
					['0xFF8000', 'converts $1 to RGB (\`255, 128, 0\`)'],
				],
			},
			callback: ( msg, args ) => {
				const stringHEX = args[0].matchFirst( /(?:0x|#)(([0-9a-f]{3}){1,2})/i )
				
				if( !stringHEX )
					return msg.send( 'Invalid hex provided' )
				
				const hex = Number( '0x' + stringHEX )
				const shortHEX = hex.length === 3
					
				// ( hex >> 16 ) & 0xFF
				// ( hex >> 8 ) & 0xFF
				// hex & 0xFF

				const bitmask = shortHEX ? 0xF : 0xFF
				const shift = shortHEX ? 8 : 16
				const rgb = [
					( hex >> shift ) & bitmask,
					( hex >> ( shift << 1 ) ) & bitmask,
					hex & bitmask,
				]

				if( shortHEX )
					rgb.map( n => n + ( n << 4 ) )

				msg.send( Embed()
					.setDescription( `0x${stringHEX} = **${rgb.join( ', ' )}**` )
					.setColor( hex )
				)
			},
		})

		addCmd({
			aliases: 'rgbtohex rth',
			description: {
				single: 'converts RGB to HEX',
				usages: [
					['<rgb>', 'converts $1 to HEX'],
				],
				examples: [
					['255', '128', '0', 'converts $1, $2, $3 to HEX (\`0xFF8000\`)'],
				],
			},
			callback: ( msg, args ) => {
				const rgb = args.slice( 0, 3 )
				const hex = rgb.reduce( ( hex, axis ) => {
					axis = Number( axis ).toString(16)
					return hex + ( axis < 0x10 ? '0' : '' ) + axis
				}, '' )
				
				msg.send( Embed()
					.setDescription( `${rgb.join( ', ' )} = **0x${hex}**` )
					.setColor( rgb )
				)
			},
		})
	}
}