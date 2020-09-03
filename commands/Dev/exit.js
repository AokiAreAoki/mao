module.exports = {
    requirements: 'bakadb db client',
    execute: ( requirements, mao ) => {
        requirements.define( global )

        client.once( 'ready2', () => {
            if( db.restart ){
                let timeleft = Date.now() - db.restart.timestamp
                let channel = client.channels.cache.get( db.restart.channel )

                if( channel && timeleft < 60e3 ){
                    channel.send( `I'm back! Restart took \`${timeleft < 1000 ? timeleft + 'ms' : timeleft / 1000 + ' seconds.'}\`` )
                        .then( m => m.delete( 8000 ) )
                        .catch( () => {} )
                    
                    channel.messages.fetch( db.restart.message )
                        .then( m => m.delete( 1337 ) )
                        .catch( () => {} )
                }
                    
                delete db.restart
            }
        })

        addCmd( 'exit die', { short: 'guess what', full: 'r u srsly?' }, async ( msg, args ) => {
            db.restart = {
            	message: msg.id,
            	channel: msg.channel.id,
            	timestamp: Date.now(),
            }
            bakadb.save()

            await msg.react( '717396565114880020' )
            await client.destroy()

            let code = Number( args[0] )
            process.exit( isNaN( code ) ? 0 : code )
        })
    }
}