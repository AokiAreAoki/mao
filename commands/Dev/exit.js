module.exports = {
    requirements: '',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        addCmd( 'exit die', { short: 'guess what', full: 'r u srsly?' }, async ( msg, args ) => {
            await msg.react( '717396565114880020' )
            await client.destroy()
            let code = Number( args[0] )
            process.exit( isNaN( code ) ? 0 : code )
        })
    }
}