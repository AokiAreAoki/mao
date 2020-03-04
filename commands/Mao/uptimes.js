module.exports = {
    requirements: 'embed numsplit maoclr db',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        addCmd( 'uptime', 'Mao\'s uptime', msg => {
            let uptime = process.uptime()
            let v = 'seconds'
            
            if( uptime > 60 ){
                uptime = uptime / 60
                
                if( uptime > 60 ){
                    uptime = uptime / 60
                    v = 'hours'
                } else {
                    v = 'minutes'
                }
            }
            
            msg.channel.send( `Uptime: ${Math.floor( uptime )} ${v}` )
        })

        addCmd( 'totaluptime', 'Total Mao\'s uptime', msg => {
            let totaluptime = db.totaluptime || 1
            msg.channel.send( embed()
                .addField( 'Total uptime', `${ numsplit( Math.floor( totaluptime ) ) }m = ${ numsplit( Math.floor( totaluptime / 6 ) / 10 ) }h` )
                .setColor( maoclr ) )
        })
    }
}