module.exports = {
    requirements: 'client',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        addCmd( 'ping pong', 'Checks ping', msg => msg.channel.send( `Ping: \`${Math.floor( client.ping )}ms\`` ) )
    }
}