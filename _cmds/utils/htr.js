( msg, args ) => {
	let hex = args[1].toUpperCase().replace( '0X', '' ).replace( '#', '' )
    
    let r = Number( `0x${ hex.substring( 0, 2 ) }` )
    let g = Number( `0x${ hex.substring( 2, 4 ) }` )
    let b = Number( `0x${ hex.substring( 4, 6 ) }` )
    
    let emb = new ds.RichEmbed()
        .setDescription( `**${r}, ${g}, ${b}**` )
        .setColor( `0x${hex}` )
    
    msg.channel.sendEmbed( emb )
}