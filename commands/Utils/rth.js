module.exports = {
    requirements: 'embed',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        addCmd( 'rgbtohex rth', { full: 'Converts RGB to HEX', short: 'no' }, ( msg, args ) => {
        	let hex = ''
        	
        	for( let i = 0; i < 3; ++i ){
        		let da = Number( args[i] ).toString( 16 )
        		hex = hex + ( da < 0x10 ? '0' : '' ) + da
        	}
        	
        	msg.send( embed()
        		.setDescription( `**0x${hex.toUpperCase()}**` )
       		 	.setColor( hex )
        	)
       	})
    }
}