module.exports = {
	requirements: 'log embed maoclr httpGet waitFor ytdl _tkns instanceOf',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		var mdata = {},
			m = {}
		
		function defineMData( guildID ){
			mdata[guildID] = {
				playing: false,
				queue: [],	// queue :think_about:
				disp: null,	// dispatcher
				tc: null,	// text channel
				idlingStarted: Date.now(),
				timeout: 60e3,
			}
		}

		client.once( 'ready2', () => client.guilds.cache.array().forEach( g => defineMData( g.id ) ) )
		client.on( 'guildCreate', guild => defineMData( guild.id ) )
		
		timer.create( 'voiceTimeout', 1.337, 0, () => {
			client.voice.connections.forEach( vc => {
				if( !vc ) return
				let gid = vc.channel.guild.id

				if( mdata[gid].idlingStarted !== -1 && mdata[gid].idlingStarted + mdata[gid].timeout < Date.now() ){
					leave( vc.voice )
					mdata[gid].timeout = -1
					mdata[gid].idlingStarted = -1
					return
				}

				let timeout = 0
				
				if( vc.channel.members.size === 1 ){
					timeout = 60e3
					if( mdata[gid].idlingStarted === -1 )
						mdata[gid].idlingStarted = Date.now()
				} else if( !vc.voice.connection.dispatcher ){
					timeout = 720e3
					if( mdata[gid].idlingStarted === -1 )
						mdata[gid].idlingStarted = Date.now()
				} else if( mdata[gid].idlingStarted !== -1 ){
					mdata[gid].idlingStarted = -1
					mdata[gid].timeout = -1
				}
				
				if( timeout !== 0 && mdata[gid].timeout !== timeout )
					mdata[gid].timeout = timeout
			})
		})

		/* slojno blyat' nahuy ego kr4
		client.on( 'voiceStateUpdate', ( oldstate, newstate ) => {
			let myVoice = newstate.guild.voice
			if( !myVoice || !myVoice.speaking ) return
			
			if( oldstate.channelID !== newstate.channelID ){
				let gid = newstate.guild.id

				if( newstate.channelID === myVoice.channelID ){
					let timerStart = timeout => timer.create( 'timeout' + gid, timeout, 1, () => leave( myVoice ) )
					
					if( newstate.id === myVoice.id ){
						// if mao joins vc then timeout = 666s
						let timeout = 666e3
						mdata[gid].timeout = Date.now() + timeout
						timerStart()
					} else if( !newstate.voice || !newstate.channel ){
						// if there's nobody exclude mao then timeout = 60s
						let timeout = 60e3
						mdata[gid].timeout = Date.now() + timeout
						timerStart()
					}
				}
			}
		})*/
		
		/// Function for adding music commands ///
		function addMCommand( command, description, callback ){
			let aliases = command.split( /\s+/ )
			let cmd = aliases.shift()
			
			m[cmd] = {
				aliases: aliases,
				description: description,
				func: callback,
			}
		
			if( aliases.length > 0 )
				aliases.forEach( alias => m[alias] = cmd )
		}
		
		// Some functions
		const ytapikey = _tkns.youtube
		
		class Song {
			constructor( vid, author, title ){
				this.vid = vid
				this.author = author
				this.title = title
			}

			toString(){
				return `${this.author} - ${this.title} (vid: ${this.vid})`
			}
		}

		function postfix( number ){
			number = String( number )
			if( number[number.length - 2] == '1' ) return 'th'
			switch( number[number.length - 1] ){
				case '1':
					return 'st'
					break
				
				case '2':
					return 'nd'
					break

				case '3':
					return 'rd'
					break
				
				default:
					return 'th'
					break
			}
		}

		function parseSong( vid, callback, errcallback ){
			let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${vid}&key=${ytapikey}`
			httpGet( url, body => {
				let song = JSON.parse( body ).items[0]
				callback( new Song(
					song.id.videoId ? song.id.videoId : song.id,
					song.snippet.channelTitle.replace( '`', "'" ),
					song.snippet.title.replace( '`', "'" )
				))
			}, errcallback )
		}

		function parseSongs( vids, callback, errcallback ){
			let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${vids.join( ',' )}&key=${ytapikey}`
			httpGet( url, body => {
				let songs = []

				JSON.parse( body ).items.forEach( song => {
					songs.push( new Song(
						song.id.videoId ? song.id.videoId : song.id,
						song.snippet.channelTitle.replace( '`', "'" ),
						song.snippet.title.replace( '`', "'" )
					))
				})

				callback( songs )
			}, errcallback )
		}

		function sendQueuedMessage( channel, song, requester ){
			let pos = mdata[channel.guild.id].queue.length,
				isMember = requester.constructor.name == 'GuildMember'
			
			channel.send( embed()
				.addField( 'Song queued', `Your song \`${song.author}\` - \`${song.title}\` is \`${pos + postfix(pos)}\` in the queue list.` )
				.setAuthor( isMember ? requester.displayName : requester.username, ( isMember ? requester.user : requester ).avatarURL() )
			)
		}

		function queueSong( guildID, songOrVID, callback ){
			if( songOrVID.constructor === Song ){
				mdata[guildID].queue.push( songOrVID )
				return true
			}
			
			parseSong( songOrVID, song => {
				mdata[guildID].queue.push( song )
				callback( null, song )
			}, err => callback( err ) )

			return false
		}

		function sendQueue( channel ){
			let queue = mdata[channel.guild.id].queue

			if( queue && queue.length > 0 ){
				let songs = '', i = 0
				queue.forEach( ( song, k ) => songs += `${songs.length != 0 ? '\n' : ''}[${k + 1}] • \`${song.author}\` - \`${song.title}\`` )
				channel.send( embed().addField( '**Queue:**', songs ) )
			} else
				channel.send( 'Queue is empty' )
		}

		async function queue( query, msg ){
			let vid

			if( /^https?:\/\/(\w+\.)?youtube\.com\/watch.+$/.test( query ) )
				vid = query.matchFirst( /[?&]v=([\w-_]{11})/ )
			else if( /^https?:\/\/(\w+\.)?youtu\.be\/\w+/.test( query ) )
				vid = query.matchFirst( /youtu\.be\/([\w-_]{11})/ )

			return new Promise( async res => {
				if( vid )
					queueSong( msg.guild.id, vid, ( err, song ) => {
						if( err ){
							msg.send( 'Failed adding song to the queue :(' )
							console.error( err )
							res( false )
						} else {
							sendQueuedMessage( msg, song, msg.member )
							res( true )
						}
					})
				else {
					let m = await msg.send( `Searching for \`${query}\`...` )
					
					searchOnYT( query, async songs => {
						if( songs.length == 0 ){
							( await m.edit( 'Nothing found :(' ) ).delete( 2280 )
							res( false )
						} else {
							let results = '```'

							for( let i = 0; i < songs.length; ++i ){
								let song = `\n[${i + 1}] ${songs[i].author} - ${songs[i].title}`
								if( results.length + song.length <= 1997 ) // 2k discord char limit - 3 "```" at the end
									results += song
								else break
							}

							m.edit( results + '```' )

							waitFor({
								memberID: msg.member.id,
								timeout: 30,
								message: m,
								messageDeleteDelay: 22880,
								onMessage: ( msg, stopWaiting ) => {
									let n = msg.content.matchFirst( /^\d\d?$/ )
									if(n){
										n = Number(n)
										
										if( n <= songs.length ){
											if( n == 0 )
												m.edit( 'Canceled' ).then( m => m.delete( 2280 ) )
											else {
												if( queueSong( msg.guild.id, songs[n - 1] ) ){
													sendQueuedMessage( msg.channel, songs[n - 1], msg.member )
													res( true )
												} else {
													msg.send( embed().setDescription( 'Nothing found :(' ).setColor( 0xff0000 ) )
													res( false )
												}
											}

											m.delete( 1337 )
											msg.delete( 1337 )
											stopWaiting()
										}
									}
								},
								onOverwrite: () => res( false ),
								onTimeout: () => res( false ),
							})
						}
					}, console.error )
				}
			})
		}

		function sendNowPlaying( channel, song ){
			channel.send( embed().addField( 'Now playing:', `\`${song.author}\` - \`${song.title}\`` ) )
		}

		const maxResCnt = 10

		function searchOnYT( q, callback, errcallback, maxResCntOverride ){
			maxResCntOverride = typeof maxResCntOverride == 'number' ? maxResCntOverride : maxResCnt
			let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResCntOverride}&q=${encodeURI(q)}&key=${ytapikey}`
			httpGet( url, body => {
				body = JSON.parse( body )

				if( !body.items[0] ){
					callback( null )
					return
				}

				let songs = []

				body.items.forEach( song => {
					songs.push( new Song(
						song.id.videoId ? song.id.videoId : song.id,
						song.snippet.channelTitle.replace( '`', "'" ),
						song.snippet.title.replace( '`', "'" )
					))
				})

				callback( songs )
			}, errcallback )
		}

		async function join( voiceChannel, textChannel, callback, message=null ){
			if( typeof textChannel == 'function' ){
				callback = textChannel
				textChannel = null
			}
			
			if( !voiceChannel.guild.voice || voiceChannel.guild.voice.channelID != voiceChannel.id ){
				await voiceChannel.join()
				let gid = voiceChannel.guild.id
				
				if( textChannel ){
					mdata[gid].tc = textChannel
					mdata[gid].timeout = 60e3
					mdata[gid].idlingStarted = Date.now()
				}
				
				if( message ) await message.send( 'Joined ' + voiceChannel.name + ( mdata[gid].tc != message.channel ? ' and bounded to #' + message.channel.name : '' ) )
				if( typeof callback === 'function' ) callback( true, voiceChannel )
			} else {
				if( message ) await message.send( 'Connect to the voice channel first, baka~!' )
				if( typeof callback === 'function' ) callback( false )
			}
		}

		async function leave( guild, callback ){
			callback = callback || ( () => {} )

			try {
				if( guild.voice && guild.voice.channel ){
					stop( guild )
					await guild.voice.kick()
						.then( () => callback( true ) )
						.catch( err => callback( false, err ) )
				} else
					callback( true )
			} catch( err ){
				callback( false, err )
			}
		}

		async function play( guild, song ){
			if( mdata[guild.id].playing ) return false

			if( !song ){
				song = mdata[guild.id].queue[0]
				if( !song ) return false
			}
			
			if( song instanceof Song )
				song = song.vid
			
			if( typeof song == 'string' ){
				if( /^[\w_-]{11}$/.test( song ) )
					song = await ytdl( 'https://youtu.be/' + song ) // { filter: 'audioonly' }
				else if( /^https?:\/\/(\w+\.)youtu\.?be(\w+)\/.{11,}$/.test( song ) )
					song = await ytdl( song ) // { filter: 'audioonly' }
				else
					return false
			}
			
			let disp = mdata[guild.id].disp

			if( disp && disp.broadcast )
				disp.broadcast.end()

			if( guild.voice && guild.voice.connection ){
				mdata[guild.id].disp = guild.voice.connection.play( song, { type: 'opus' } )
					.on( 'start', () => {
						sendNowPlaying( mdata[guild.id].tc, mdata[guild.id].queue[0] )
					})
					.on( 'finish', () => {
						if( mdata[guild.id].playing && mdata[guild.id].queue.shift() )
							play( guild, mdata[guild.id].queue[0] )
					})
					.on( 'error', err => {
						console.log( '\nMusic error happened:\n' )
						console.error( err )
						console.log()
						
						if( mdata[guild.id].tc )
							mdata[guild.id].tc.send( 'An error occurred :(' )
					})
				
				mdata[guild.id].playing = true
				return true
			}

			return false
		}

		async function play2( message ){
			if( !message.guild.voice || !message.guild.voice.connection )
				if( message.member.voice && message.member.voice.channel )
					await join( message.member.voice.channel, message.channel, null, message )
		
			play( message.guild )
		}

		function skip( guild ){
			let skipped_song = mdata[guild.id].queue[ mdata[guild.id].queue.length - 1 ]

			if( mdata[guild.id].disp && mdata[guild.id].disp.broadcast )
				mdata[guild.id].disp.broadcast.end()
			else
				mdata[guild.id].queue.shift()

			return skipped_song
		}

		function stop( guild ){
			if( mdata[guild.id].disp && mdata[guild.id].disp.broadcast )
				mdata[guild.id].disp.broadcast.end()
			mdata[guild.id].playing = false
		}

		/// Music commands ///
		addMCommand( 'join j', 'Joins your voice channel', msg => {
			if( msg.member.voice )
				join( msg.member.voice.channel, msg.channel, msg )
			else
				msg.send( 'Connect to the voice channel first, baka~!' )
		})

		addMCommand( 'leave l', 'Leaves your voice channel', msg => {
			if( msg.guild.voice && msg.guild.voice.channel )
				leave( msg.guild, succes => msg.send( succes ? 'Left voice channel' : 'Something went wrong 😔' ) )
			else
				msg.send( "I can't, due to quarantine" )
				//msg.send( "I'm not in the voice channel" )
		})

		addMCommand( 'queue q',
			'Shows queue/Adds song the queue'
			+ '\n`music qp` - Shows queue'
			+ '\n`music qp <song>` - Searching for a song on the youtube'
			+ '\n`music qp <yt video url>` - Adds a video to the queue',
		async ( msg, args, get_string_args ) => {
			if( args[0] ){
				queue( get_string_args(), msg )
			} else
				sendQueue( msg )
		})

		addMCommand( 'play p', 'Plays music', async msg => {
			let queue = mdata[msg.guild.id].queue
			if( queue && queue[0] ) play2( msg )
			else msg.send( 'Queue is empty' )
		})

		addMCommand( 'queueplay qp',
			'Shows queue/Adds song the queue and plays it'
			+ '\n`music qp` - Shows queue'
			+ '\n`music qp <song>` - Searching for a song on the youtube'
			+ '\n`music qp <yt video url>` - Adds a video to the queue',
		async ( msg, args, get_string_args ) => {
			if( args[0] ){
				queue( get_string_args(), msg ).then( succes => {
					if( !succes ) return
					let queue = mdata[msg.guild.id].queue
					if( queue && queue[0] ) play2( msg )
				})
			} else
				sendQueue( msg )
		})

		addMCommand( 'skip s', `Skips song (doesn't work ¯\\_(ツ)_/¯)`, async ( msg, args, get_string_args ) => {
			let skipped_song = skip( msg.guild )
			msg.send( embed().addField( 'Skipped:', `\`${skipped_song.author}\` - \`${skipped_song.title}\`` ) )
		})

		addMCommand( 'stop st', 'Stops music', async msg => {
			await stop( msg.guild )
			msg.send( 'Music stopped' )
		})

		/// Main music command ///
		let full = '*TODO*'
		addCmd( 'music m', { short: 'Plays music from youtube', full: full }, ( msg, args, get_string_args ) => {
			let option = args[0]

			if( m[option] ){
				// Aliases Redirection
				if( typeof m[option] == 'string' )
					option = m[option]
				option = m[option]
				
				// Args2
				let args_pos2 = get_string_args.args_pos.slice(1),
					string_args2 = get_string_args()

				function get_string_args2( number=0 ){
					return typeof args_pos2[number] == 'number' ? string_args2.substring( args_pos2[number] ) : ''
				}
				
				if( typeof option.func == 'function' )
					option.func( msg, args.slice(1), get_string_args2 )
				else
					log( `Error: m.${option}.func is a ${typeof option.func}, function expected` )
			} else {
				let emb = embed()
					.setAuthor( msg.member.displayName, msg.author.avatarURL )
				
				for( let cmd in m ){
					let data = m[cmd]
					if( typeof data === 'object' )
						emb.addField( `**${cmd}${data.aliases.length > 0 ? ', ' + data.aliases.join( ', ' ) : ''}**`, data.description || 'no description :c' )
				}

				msg.send( emb )
			}
		})
	}
}
