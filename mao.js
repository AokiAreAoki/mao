const cp = require( 'child_process' )

function start(){
	let mao = cp.fork( __dirname + '/index.js', process.argv.slice(2) )
	
	if( process.platform === 'win32' )
		cp.exec( `wmic process where "ProcessID=${mao.pid}" CALL setpriority "above normal"` )
	//else
		//console.log( `\nmao.js :: DO THE NICE, BAKA\n` )
		// cp.exec( `nice...` )

	mao.once( 'exit', code => {
		console.log( `\nMao exited with code ${code}` )
		
		if( code == 228 ) // full exit code (will not restart)
			return console.log( `Full exit code received. Mao won't be restarted. Exit.` )
		
		console.log( `Restarting Mao...\n` )
		setTimeout( start, code === 0 ? 228 : 7331 )
	})
}

console.log()
start()