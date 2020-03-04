( msg, args ) => {
    let hex = ''

    for( let i = 1; i <= 3; ++i ){
        let da = Number( args[i] ).toString( 16 )
        hex = hex + ( da < 0x10 ? '0' : '' ) + da
    }

    let emb = new ds.RichEmbed()
        .setDescription( `**0x${hex.toUpperCase()}**` )
        .setColor( hex )

    msg.channel.sendEmbed( emb )
}