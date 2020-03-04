module.exports = {
    requirements: '',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        addCmd( 'exit die', { short: 'guess what', full: 'r u srsly?' }, async ( msg, args ) => {
            await msg.react( '574361160455815172' )
            await client.destroy()
            let code = Number( args[0] )
            process.exit( isNaN( code ) ? 0 : code )
        })
    }
}