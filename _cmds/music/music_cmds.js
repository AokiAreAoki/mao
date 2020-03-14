
function play( channel ){
	try {
		var stream = streams[channel.guild.id]
		if( !stream.queue[0] ) return;

		stream.disp = channel.guild.voiceConnection.playStream( yas( stream.queue[0][0] ) ) // { filter: 'audioonly' }
		ezembed( channel, 'Now playing:', `\`${stream.queue[0][1]}\`` )
		
		stream.disp.on( 'end', () => {
			if( !stream.togglePlaying ) return;

			stream.queue.shift()

			if( stream.queue[0] ) play( channel )
			else stream.togglePlaying = false
		})
	} catch( err ){
		sendcb( channel, err )
	}
}

function join( messageOrTextChannel, memberOrVoiceChannel, callback ){
	let tc = messageOrTextChannel.constructor.name == 'TextChannel'  ? messageOrTextChannel : messageOrTextChannel.channel
	let vc = memberOrVoiceChannel.constructor.name == 'VoiceChannel' ? memberOrVoiceChannel : memberOrVoiceChannel.voiceChannel

	if( tc.guild.voiceConnection && tc.guild.voiceConnection.channel.id == vc.id ){
		streams[tc.guild.id].channel = tc
		ezembed1( tc, `Bounded to \`#${tc.name}\`` )
		if( typeof callback == 'function' ) callback()
	} else {
		streams[tc.guild.id].channel = tc
		
		vc.join().then( connection => {
			ezembed1( tc, `Joined to \`${vc.name}\` and bounded to \`#${tc.name}\`` )
			if( typeof callback == 'function' ) callback()
		})
	}
}

var maxResCnt = 20
var pendingTimeout = 120
var pendingRequests = {}

async function showResultsFor( data ){
	try {
		var str = '```\n' + `Results for "${data.searchtext}":\n`
		var results = {}
		
		for( let i = 0; i < maxResCnt; i++ ){
			let item = data.info[i]
			if( !item ) continue;

			str = str + '\n[' + ( i + 1 ) + '] - ' + item.title
			//results[i + 1] = item
		}
		
		data.searchmsg.delete()
		let pendingMsg = await data.msg.channel.send( str + '\n[0 or c] - cancel```' )
		
		if( pendingRequests[data.msg.member.id] && pendingRequests[data.msg.member.id].pendingMsg ){
			pendingRequests[data.msg.member.id].pendingMsg.edit( 'Question canceled' )
				.then( m => m.delete( 1337 * 2 ) )
		}

		pendingRequests[data.msg.member.id] = {
			pendingMsg: pendingMsg,
			msg: data.msg,
			info: data.info,
			ded: curtime() + pendingTimeout,
			stream: data.stream,
			queueplay: data.queueplay,
		}
	} catch( err ){
		console.error( err )

		data.searchmsg.edit( cb( err ) )
		data.searchmsg.delete( 32000 )
	}
}
			
function addToQueue( stream, item, msg, queueplay, silent ){
	let title = item.artist + ' - ' + item.title
	log( title )

	var yturl = 'https://www.youtube.com/watch?v=' + item.id
	log( yturl )
	
	stream.queue.push( [ yturl, title ] )
	
	let cnt = String( stream.queue.length )
	let postfix = 'th'
	
	if( cnt[cnt.length - 2] != '1' )
		switch( cnt[cnt.length - 1] ){
			case '1':
				postfix = 'st';
				break;
			
			case '2':
				postfix = 'nd';
				break;

			case '3':
				postfix = 'rd';
				break;
		}

	if( queueplay & !stream.togglePlaying ) m.p( msg );

	if( !silent )
		ezembed(
			msg.channel,
			'Added to queue',
			`Your song \`${title}\` is \`${stream.queue.length + postfix}\` in the queue list.`
		)
}

var m = {}
var streams = {}
var waitingForActivity = 600

m.play = function( msg, args ){
	var stream = streams[msg.guild.id]

	if( msg.guild.voiceConnection )
		if( stream.togglePlaying )
			msg.channel.send( "The music is already playing" )
		else {
			stream.togglePlaying = true
			play( msg.channel )
		}
	else
		if( !msg.member.voiceChannel )
			msg.channel.send( "You're not connected to the voice channel!" )
		else
			join( msg, msg.member, () => play( msg.channel ) )
}
m.p = m.play

m.join = function( msg, args ){
	join( msg, msg.member )
}
m.j = m.join;

m.leave = function( msg, args ){
	if( msg.guild.voiceConnection ){
		var stream = streams[msg.guild.id];
		stream.togglePlaying = false;
		
		if( stream.disp ) stream.disp.end();

		msg.guild.voiceConnection.disconnect()
	}
}
m.l = m.leave;

const gapikey = readFile( 'gapikey' )

m.queue = async function( msg, args, queueplay ){
	let url = ''

	try {
		let cmd = msg.content.match( RegExp( `^.*?${ args[0] }\\s+${ args[1] }\\s*` ) )[0]
		url = msg.content.substring( cmd.length )
	} catch( err ){
		msg.channel.send( 'url:' + cb( err ) )
	}

	if( !url ){
		var stream = streams[msg.guild.id]

		if( stream && stream.queue && stream.queue[0] ){
			var str = ''
			
			for( let i = 0; i < stream.queue.length; i++ ) {
				let title = stream.queue[i][1]
				let toAdd = `${i == 0 ? '' : '\n'}[${i + 1}] • ${title}`

				if( ( str + toAdd + '\n...' ).length > 1024 ){
					str += '\n...'
					break
				}

				str += toAdd
			}
			
			ezembed( msg.channel, 'Queue:', str )
			return
		}

		ezembed1( msg.channel, 'Queue is empty' )
		return
	}
	
	if( !streams[msg.guild.id] ) streams[msg.guild.id] = {
		queue: [],
		togglePlaying: false,
	}
	
	var stream = streams[msg.guild.id]
	
	try {
		if( url.match( /(https?:\/\/)?(\w+\.)?youtu(\.be)?/ ) ){
			log( `URL: ${url}` )

			let yturl = url.match( /(https?:\/\/)?(\w+\.)?youtube\.com\/watch\?/ )
			let list = false

			if( yturl ){
				let li

				if( li = url.match( /list=(?=[a-zA-Z0-9-_]{13})/ ) ){
					let lidpos = url.search( li ) + 5
					url = url.substring( lidpos ).match( /[a-zA-Z0-9-_]+/ )
					list = true
				} else {
					let vidpos = url.search( /v=(?=[a-zA-Z0-9-_]{11})/ ) + 2

					if( vidpos ){
						url = url.substring( vidpos, vidpos + 11 )
					} else {
						msg.channel.send( 'Failed to find Video/List ID' )
						log( `Failed to find Video/List ID in this YT link: ${url}` )
						return
					}
				}
			} else {
				let sub = url.match( /(https?:\/\/)?youtu\.be\// )
				
				if( sub ){
					url = url.substring( sub[0].length, sub[0].length + 11 )
				} else {
					msg.channel.send( 'Failed to find Video ID' )
					log( `Failed to find Video ID in this YT link: ${url}` )
					return
				}
			}

			if( url && list ){
				let requrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${url}&key=${gapikey}`

				httpGet( requrl, body => {
					let data = JSON.parse( body )

					if( !data || !data.items || data.items.length == 0 ){
						msg.channel.send( 'Playlist not found' )
						return
					}

					for( let i = 0; i < data.items.length; i++ ){
						let item = data.items[i]

						let simpleitem = {
							id: item.snippet.resourceId.videoId,
							artist: item.snippet.channelTitle.replace( '`', "'" ),
							title: item.snippet.title.replace( '`', "'" )
						}

						log( `[${simpleitem.id}] ${simpleitem.artist} - ${simpleitem.title}` )
						addToQueue( stream, simpleitem, msg, i == 0 ? queueplay : false, true )
					}

					ezembed(
						msg.channel,
						'List added to queue',
						data.items.length + ' song' + ( data.items.length != 1 ? 's' : '' ) + ' added to the queue list.'
					)
				}, err => {
					sendcb( msg.channel, err )
				})

				return
			}
			
			let searchmsg = await msg.channel.send( 'Loading...' )
			
			log( `Requesting ${url}...` )
			
			let requrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${url}&key=${readFile( 'gapikey' )}`
			let channel = msg.channel

			httpsGet( requrl, async ( data ) => {
				log( 'OK' )
				let ytitem = JSON.parse( data ).items[0]
				
				let item = {
					id: ( ytitem.id.videoId ? ytitem.id.videoId : ytitem.id ),
					artist: ytitem.snippet.channelTitle.replace( '`', "'" ),
					title: ytitem.snippet.title.replace( '`', "'" ),
				}

				log( tabletostring( item ) )

				addToQueue( stream, item, msg, queueplay )
				searchmsg.delete()
			}, async ( err ) => {
				searchmsg.delete()
				let msg = await sendcb( msg.channel, err )
				msg.delete( 12e3 );
			})

			return
		}
		
		let searchmsg = await msg.channel.send( 'Searching...' )
		let requrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResCnt}&q=${ encodeURI( url ) }&key=${readFile( 'gapikey' )}`

		httpsGet( requrl, async ( data ) => {
			try {
				data = JSON.parse( data )
				
				if( !data.items[0] ){
					ezembed1( msg.channel, 'Your song not found :c' );
					return;
				};

				let newdata = {}

				for( let i = 0; i < data.items.length; i++ ){
					let item = data.items[i]
					/*
					let yttime = item.contentDetails.duration
					let time = 0
					let n

					n = yttime.match( /\d+S/ )
					if( n ) time += Number( n[0].substring( 0, n[0].length - 1 ) );

					n = yttime.match( /\d+M/ )
					if( n ) time += Number( n[0].substring( 0, n[0].length - 1 ) ) * 60;

					n = yttime.match( /\d+H/ )
					if( n ) time += Number( n[0].substring( 0, n[0].length - 1 ) ) * 3600;
					*/

					newdata[i] = {
						id: item.id.videoId,
						artist: item.snippet.channelTitle.replace( '`', "'" ),
						title: item.snippet.title.replace( '`', "'" ),
						//time: time == 0 ? -1 : time,
					}
				}

				showResultsFor({
					msg: msg,
					searchmsg: searchmsg,
					info: clone( newdata ),
					searchtext: url,
					stream: stream,
					queueplay: queueplay,
				})
			} catch( err ){
				let msg = await sendcb( msg.channel, err )
				msg.delete( 12e3 );
			}
		});
	} catch( err ){
		console.error( err );

		searchmsg.edit( cb( err ) )
		searchmsg.delete( 12e3 )
	};
}
m.q = m.queue;

/*
m.multiqueue = async function( msg, args, queueplay ){
	for( let i = 2; i < args.length; i++ ){
		if( !args[i].match( /^https?:\/\// ) ) continue;

		//msg.channel.send( `<${args[i]}>` )

		try {
			ytdl.getInfo( args[i] ).then( ( info ) => {
				if( !info.items[0] ) return;

				msg.channel.send( info.items[0].title || 'error' )
				//addToQueue( streams[msg.guild.id], info.items[0], msg, queueplay || false )
			})
		} catch( err ){
			sendcb( msg.channel, err )
		}
	}
}
m.mq = m.multiqueue

m.multiqueueplay = function( msg, args ){
	m.mq( msg, args, true )
}
m.mqp = m.multiqueueplay
*/

m.skip = function( msg, args ){
	var stream = streams[msg.guild.id];

	if( stream.queue ){
		if( stream.queue.length > 0 ){
			msg.channel.send( 'Skipped' );
			
			stream.disp.end();
			return;
		};
	};

	msg.channel.send( 'Queue list is empty' );
};
m.s = m.skip;

m.purge = function( msg ){
	streams[msg.guild.id].queue = []
}

m.queueplay = function( msg, args ){
	m.q( msg, args, true );
}
m.qp = m.queueplay;

m.repeat = function( msg, args ){
	var stream = streams[msg.guild.id];

	if( !args[2] ){
		let code    = "• `off` (or `0`) - disables repeating.\n";
		code = code + "• `one` (or `1`) - repeats current song.\n";
		code = code + "• `all` (or `2`) - repeats all queue.";
		/// Yes, it's very cool code
		
		ezembed( msg.channel, "Types of repeat:", code );
	};
};
m.r = m.repeat;

client.once( 'ready', () => {
	for( let k in client.guilds.array() ){
		var guild = client.guilds.array()[k];
		
		streams[guild.id] = {
			togglePlaying: false,
			queue: [],
			connected: true,
			lastActivity: 0,
		};
	};
	
	setInterval( function(){
		for( let k in client.guilds.array() ){
			var guild = client.guilds.array()[k];
			var stream = streams[guild.id];

			if( !stream ) return;
			if( typeof stream.connected == 'undefined' ) stream.connected = null;

			if( stream.connected != guild.voiceConnection ){
				stream.connected = guild.voiceConnection;

				if( stream.connected ){
					stream.lastActivity = curtime();
				};
			};

			if( stream.connected ){
				var cnt = guild.voiceConnection.channel.members.array().length;

				if( cnt > 1 ){
					stream.lastActivity = curtime();
				} else {
					if( stream.lastActivity + waitingForActivity < curtime() ){
						guild.voiceConnection.disconnect();
					};
				};
			};
		};
	}, 1000 );

	setInterval( () => {
		for( let k in pendingRequests ){
			let data = pendingRequests[k]

			if( data.ded < curtime() ){
				( async () => {
					let msg = await data.msg.channel.send( 'Question timed out' )
					msg.delete( 12e3 )
				} )()
				
				data.pendingMsg.delete()
				delete pendingRequests[k]
				return;
			}
		}
	}, 100 )
});

client.on( 'message', async ( msg ) => {
	for( let k in pendingRequests ){
		let data = pendingRequests[k]
		
		if( msg.author.id == k ){
			let txt = msg.content
			let num = Math.abs( Math.floor( Number( txt ) ) )
			let nums = txt.split( /\s+/ )

			if( num > 0 && num <= maxResCnt && data.info[num - 1] ){
				addToQueue( data.stream, data.info[num - 1], data.msg, data.queueplay )

				data.pendingMsg.delete()
				msg.delete()

				delete pendingRequests[k]
				return
			}

			if( nums[0] == 0 || txt == 'c' || txt == 'с' ){ // english & russian letter 'c'
				data.pendingMsg.delete()
				msg.delete()
				
				delete pendingRequests[k]
				
				let cancel = await msg.channel.send( 'Question canceled' )
				cancel.delete( 8e3 )
				
				return
			}

			return
			
			if( !nums ) return;
			if( nums.length == 0 ) return;
			
			if( nums.length == 1 ){
				if( nums[0] == 0 || txt == 'c' || txt == 'с' ){ // english & russian letter 'c'
					data.pendingMsg.delete()
					msg.delete()
					
					delete pendingRequests[k]
					
					let cancel = await msg.channel.send( 'Question canceled' )
					cancel.delete( 8e3 )
					
					return
				}
			}
			
			for( let k in nums ){
				let num = Math.abs( Math.floor( Number( nums[k] ) ) )
				if( !num ) return;
			}

			let added = 0
			
			for( let k in nums ){
				let num = nums[k]
				
				if( num > 0 && num <= maxResCnt && data.info[num - 1] ){
					addToQueue( data.stream, data.info[num - 1], data.msg, data.queueplay, nums.length != 1 )
					++added
				}
			}

			if( added == 0 ) return;
		}
	}
})