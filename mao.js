const cp = require( 'child_process' )

function start(){
	let mao = cp.fork( __dirname + '/index.js' )
	
	mao.once( 'exit', () => {
		console.log( '\nRestarting Mao...\n' )
		setTimeout( start, 228 )
	})
}

console.log( '\nStarting Mao...\n' )
start()