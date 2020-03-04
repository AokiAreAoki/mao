( msg, args, cmd ) => {
    let word = cmd.substring( args[0].length ).trim()

    if( !word ){
        msg.channel.send( 'Gimme word some baka~!' )
        return
    }

    httpGet( `http://api.urbandictionary.com/v0/define?term={${word}}`, body => {
        try {
            let res = JSON.parse( body ).list[0]

            if( !res ){
                msg.channel.send( 'Word not found :c' )
                return
            }

            let def = res.definition.replace( /\[(.*?)\](?!\(https?:\/\/.*?\))/g, ( _, p1 ) => `[${p1}](https://www.urbandictionary.com/define.php?term=${ encodeURI( p1 ) })` )
            let exmp = res.example.replace( /\[(.*?)\](?!\(https?:\/\/.*?\))/g, ( _, p1 ) => `[${p1}](https://www.urbandictionary.com/define.php?term=${ encodeURI( p1 ) })` )
            let date = new Date( res.written_on )
            let months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ]
            
            msg.channel.send( emb()
                .setColor( maoclr )
                .setAuthor( '@' + msg.member.user.tag, msg.member.user.avatarURL )
                .addField( 'Word', `[${ res.word }](${ res.permalink })` )
                .addField( 'Definition', def.length > 1024 ? def.substring( 0, 1021 ).replace( /(.+)[\s\n].*$/, '$1...' ) : def )
                .addField( 'Example', `*${exmp}*` )
                .addField( 'Thumbs', `:thumbsup: ${res.thumbs_up} :thumbsdown: ${res.thumbs_down}`)
                .setFooter( `by ${res.author} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}` )
            )
        } catch( err ){
            sendcb( msg.channel, err )
        }
    }, err => sendcb( msg.channel, err ) )
}