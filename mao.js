const cp = require( 'child_process' )
const log = console.log

function start(){
    let mao = cp.fork( './index.js' )
    mao.once( 'exit', () => {
        log( '\nRestarting Mao...\n' )
        setTimeout( start, 228 )
    })
}

start()