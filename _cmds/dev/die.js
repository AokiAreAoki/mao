msg => {
    fs.copyFileSync( './db/db.meta', './db/db.shutdown.meta' )
    
    msg.react( '529452304043343877' )
        .catch( () => {} )
        .then( () => {
            client.destroy()
            process.exit()
        })
}