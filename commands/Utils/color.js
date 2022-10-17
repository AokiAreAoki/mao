// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init({ addCommand }){
		const vec = require( '@/re/vector' )
		const Jimp = require( 'jimp' )
		const config = require( '@/config.yml' )

		function toByte( string_int ){
			let int = parseInt( string_int )
			return int < 0 ? 0 : int > 255 ? 255 : int
		}

		const colorSystems = {
			rgb: args => vec( toByte( args[0] ), toByte( args[1] ), toByte( args[2] ) ).toHex(),
			hex: args => {
				let hex = args[0].matchFirst( /([\da-f]{3}([\da-f]{3})?)/i )

				if( hex.length !== 6 )
					hex = hex.replace( /([\da-f])/gi, '$1$1' )

				return parseInt( hex, 16 )
			},
			hsl: args => {
				let h = Math.abs( Number( args[0] ) % 360 ),
					s = /\d{1,3}%/.test( args[1] ) ? parseInt( args[1].substring( 0, args[1].length - 1 ) ) / 100 : Number( args[1] ),
					l = /\d{1,3}%/.test( args[2] ) ? parseInt( args[2].substring( 0, args[2].length - 1 ) ) / 100 : Number( args[2] ),
					c = ( 1 - Math.abs( 2*l - 1 ) ) * s,
					x = c * ( 1 - Math.abs( ( h / 60 ) % 2 - 1 ) ),
					m = l - c / 2

				let seg = h / 120, // segment
					clr = vec( c, x, 0 )

				if( seg >= 0.5 )
					clr.remixAxes( 'yxz' )
				if( h >= 120 )
					clr.remixAxes( Math.floor( seg ) === 1 ? 'zxy' : 'yzx' )

				let result = clr.add(m).mul(255).toHex()
				return result
			},
			hsv: 'hsl',
			mao: () => config.maoclr,
		}

		addCommand({
			aliases: 'color clr',
			description: {
				short: 'displays color',
				full: [
					`Gets color`,
					`Supported color types: RGB, HEX and HSL/HSV`,
					`* \`HSL/HSV\` doesn't auto-detects. You have to specify \`hsl\`/\`hsv\` as a color type to use it.`,
				],
				usages: [
					[`[type]`, `<color data...>`, ''],
				],
				examples: [
					['rgb', '255', '0', '127', 'RGB color system with `rgb` type specified'],
					['hex', '#Ff0000', 'HEX color system with `hex` type specified'],
					['#08F', 'short HEX without `hex` type specified'],
					['hsl', '160', '50%', '100%', 'HSL color system with `hsl` type specified (required)'],
					['hsl', '30', '1', '0.5', `same as previous but there's coefficients(\`[0; 1]\`) instead of percentages`],
				],
			},
			callback: ( msg, args ) => {
				if( !args[0] )
					return msg.send( 'Usage: `-help color`' )

				let system = args[0].toLowerCase()

				if( colorSystems[system] )
					args.shift()
				else {
					if( /^\d{1,3}(\s+\d{1,3}){2}/.test( args.getRaw() ) )
						system = 'rgb'
					else if( /^(#|0x)[\da-f]{3,6}$/i.test( system ) )
						system = 'hex'
					else
						return msg.send( 'Invalid color specifying' )
				}

				if( typeof colorSystems[system] === 'string' )
					system = colorSystems[system]
				let color = colorSystems[system]( args, args.getRaw() )

				if( typeof color == 'number' ){
					new Jimp( 64, 64, color * 0x100 + 0xFF, ( err, img ) => {
						if( err )
							return msg.sendcb( err )

						img.rgba( false )
						msg.send( img )
						/*img.getBuffer( Jimp.MIME_JPEG, ( err, buffer ) => {
							delete img
							if( err ) msg.sendcb( err )
							else msg.send({ files: [buffer] })
								.catch( err => msg.sendcb( err ) )
						})*/
					})
				} else
					msg.send( 'Woops... Failed to parse the color :(((' )
			}
		})
	}
}
