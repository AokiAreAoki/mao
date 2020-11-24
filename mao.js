const cp = require( 'child_process' )

function start(){
	let mao = cp.fork( __dirname + '/index.js', process.argv.slice(2) )
	
	if( process.platform === 'win32' )
		cp.exec( `wmic process where "ProcessID=${mao.pid}" CALL setpriority "above normal"` )
	//else
		//console.log( `\nmao.js :: DO THE NICE, BAKA\n` )
		// cp.exec( `nice...` )

	mao.once( 'exit', () => {
		console.log( '\nRestarting Mao...\n' )
		setTimeout( start, 228 )
	})
}

console.log( '\nStarting Mao...\n' )
start()