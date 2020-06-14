module.exports = {
    requirements: 'client',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        addCmd( 'ping pong', 'Checks ping', ( msg, args ) => msg.send( `P${args[-1][1] === 'o' ? 'i' : 'o'}ng: \`${Math.floor( client.ws.ping )}ms\`` ) )
    }
}