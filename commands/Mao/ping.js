module.exports = {
    requirements: 'client',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        addCmd( 'ping pong', 'Checks ping', msg => msg.send( `Ping: \`${Math.floor( client.ws.ping )}ms\`` ) )
    }
}
