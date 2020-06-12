module.exports = {
    requirements: 'embed',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        
        addCmd( 'lmgtfy lmg whatis whats', { short: 'googles that for you or someone else', full: `Usage: \`lmgtfy <search rquest> [--flags]\`` }, ( msg, args, get_string_args ) => {
            let url = 'https://lmgtfy.com/?q=',
                q = get_string_args(),
                iie = '',
                whatis = args[-1].toLowerCase().startsWith( 'what' ) ? 'What is ' : '',
                timeout = 1337 + Math.random() * 3e3
            
            if( !q )
                return msg.send( 'Usage: `-help lmgtfy`' )

            if( q.matchFirst( /(^|[\s\n]+)-+iie\b/i ) ){
                q = q.replace( /(^|[\s\n]+)-+iie\b/i, '' )
                iie = '&iie=1'
            }

            url += encodeURI( q.replace( /\s+/g, '+' ) ) + iie

            msg.send( embed()
                .addField( `OK 👌. Googling \`${whatis + q}\`...`, 'Please wait a bit :^)' )
            ).then( m => {
                setTimeout( () => m.edit( embed().addField( 'Found!', `Click here to find out ${whatis.toLowerCase()}[__${q}__](${url})` ) ), timeout )
            })
        })
    }
}