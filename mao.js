const cp = require( 'child_process' )

function start( itsRestart ){
	let mao = cp.fork( __dirname + '/index.js', process.argv.slice(2) )
	
	if( process.platform === 'win32' ){
		cp.exec( `wmic process where "ProcessID=${process.pid}" CALL setpriority "above normal"` )
		cp.exec( `wmic process where "ProcessID=${mao.pid}" CALL setpriority "above normal"` )
	} else {
		// here could be linux's nice
		//cp.exec( `nice...` )
	}

	if( itsRestart )
		console.log( `Restarting Mao...` )

	mao.once( 'exit', code => {
		console.log( `\nMao exited with code ${code}` )
		
		if( code == 228 ) // full exit code (will not restart)
			return console.log( `Full exit code received. Mao won't be restarted. Exit.` )
		
		if( code === 0 )
			start( true )
		else
			setTimeout( start, 7331 )
	})
}

start()