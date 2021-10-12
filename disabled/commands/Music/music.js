module.exports = {
	requirements: 'log Embed httpGet ytdl _tkns instanceOf',
	init: ( requirements, mao ) => {
		requirements.define( global )

		let mdata = {},
			m = {}
		
		function defineMData( guildID ){
			mdata[guildID] = {
				playing: false,
				queue: [],	// song queue
				disp: null,	// dispatcher
				tc: null,	// text channel
				idlingStarted: -1,
			}
		}

		function getTimeoutForConnection( connection ){
			if( !instanceOf( connection, 'VoiceConnection' ) )
				return 0
			
			if( connection.channel.members.size === 1 )
				return 60e3
			
			if( !connection.dispatcher )
				return 720e3
			
			return 0
		}

		client.once( 'ready2', () => client.guilds.cache.forEach( g => defineMData( g.id ) ) )
		client.on( 'guildCreate', guild => defineMData( guild.id ) )
		
		client.on( 'voiceStateUpdate', ( oldState, newState ) => {
			if( newState.id !== client.user.id )
				return
				
			if( !newState.selfDeaf )
				newState.setDeaf( true )
		})

		timer.create( 'voiceTimeout', 1.337, 0, () => {
			client.voice?.connections?.forEach( connection => {
				if( !connection ) return
				
				let now = Date.now()
				let guild = connection.channel.guild
				let timeout = getTimeoutForConnection( connection )
					
				if( mdata[guild.id].idlingStarted === -1 ){
					if( timeout !== 0 )
						mdata[guild.id].idlingStarted = now
				} else if( timeout === 0 ){
					mdata[guild.id].idlingStarted = -1
				} else if( mdata[guild.id].idlingStarted + timeout < now ){
					leave( guild )
					mdata[guild.id].idlingStarted = -1
					return
				}
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
		const ytapikey = _tkns.google
		
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
			
			if( number[number.length - 2] === '1' )
				return 'th'

			switch( number[number.length - 1] ){
				case '1':	return 'st'
				case '2':	return 'nd'
				case '3':	return 'rd'
				default:	return 'th'
			}
		}

		function parseSong( vid, callback, errcallback ){
			/*
			ytdl.getInfo( vid )
				.then( ( { player_response: { videoDetails: vd } } ) => {
					callback?.( new Song( vd.videoId, vd.author, vd.title ) )
				})
				.catch( err => errcallback?.( err ) )
			*/

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
				isMember = requester.constructor.name === 'GuildMember'
			
			channel.send( Embed()
				.addField( 'Song queued', `Your song \`${song.author}\` - \`${song.title}\` is \`${pos + postfix(pos)}\` in the queue list.` )
				.setAuthor( isMember ? requester.displayName : requester.username, ( isMember ? requester.user : requester ).avatarURL() )
			)
		}

		function queueSong( guildID, songOrVID, callback ){
			if( songOrVID instanceof Song ){
				mdata[guildID].queue.push( songOrVID )
				return true
			}
			
			parseSong( songOrVID, song => {
				mdata[guildID].queue.push( song )
				callback?.( null, song )
			}, err => callback?.( err ) )

			return false
		}

		function sendQueue( channel ){
			let queue = mdata[channel.guild.id].queue

			if( queue && queue.length > 0 ){
				let songs = '', i = 0
				queue.forEach( ( song, k ) => songs += `${songs.length != 0 ? '\n' : ''}[${k + 1}] • \`${song.author}\` - \`${song.title}\`` )
				channel.send( Embed().addField( '**Queue:**', songs ) )
			} else
				channel.send( 'Queue is empty' )
		}

		async function queue( query, msg ){
			let vid

			if( /^https?:\/\/(\w+\.)?youtube\.com\/watch.+$/.test( query ) )
				vid = query.matchFirst( /[?&]v=([\w-_]{11})/ )
			else if( /^https?:\/\/(\w+\.)?youtu\.be\/\w+/.test( query ) )
				vid = query.matchFirst( /youtu\.be\/([\w-_]{11})/ )

			return new Promise( async resolve => {
				if( vid ){
					queueSong( msg.guild.id, vid, ( err, song ) => {
						if( err ){
							msg.send( 'Failed adding song to the queue :(' )
							console.error( err )
							resolve( false )
						} else {
							sendQueuedMessage( msg, song, msg.member )
							resolve( true )
						}
					})
				} else {
					let displayMessage = await msg.send( `Searching for \`${query}\`...` )
					
					searchOnYT( query, async songs => {
						if( songs == null || songs.length == 0 ){
							( await displayMessage.edit( 'Nothing found :(' ) ).delete( 2280 )
							resolve( false )
						} else {
							let results = '```'

							for( let i = 0; i < songs.length; ++i ){
								let song = `\n[${i + 1}] ${songs[i].author} - ${songs[i].title}`
								if( results.length + song.length <= 1997 ) // 2k discord char limit - 3 "```" at the end
									results += song
								else break
							}

							displayMessage.edit( results + '```' )

+							msg.awaitResponse({ timeout: 30, displayMessage })
								.if( msg => /^\d\d?$/.test( msg.content ) )
								.then( ( msg, waiter ) => {
									const n = parseInt( msg.content )
									
									if( n <= songs.length ){
										if( n === 0 )
											displayMessage.edit( 'Canceled' ).then( m => m.delete( 2280 ) )
										else {
											if( queueSong( msg.guild.id, songs[n - 1] ) ){
												sendQueuedMessage( msg.channel, songs[n - 1], msg.member )
												resolve( true )
											} else {
												msg.send( Embed().setDescription( 'Nothing found :(' ).setColor( 0xff0000 ) )
												resolve( false )
											}
										}

										waiter.stop()
										msg.delete( 1337 )
										displayMessage.delete( 1337 )
									}
								})
								.onTimeout( () => resolve( false ) )
								.onCancel( () => resolve( false ) )
						}
					}, console.error )
				}
			})
		}

		function sendNowPlaying( channel, song ){
			channel.send( Embed().addField( 'Now playing:', `\`${song.author}\` - \`${song.title}\`` ) )
		}

		const maxResCnt = 10

		function searchOnYT( q, callback, errcallback, maxResCntOverride ){
			/*
			ytdl.search(q)
				.then( data => {
					if( !data || !data.items || !data.items[0] ){
						callback?.( null )
						return
					}

					let songs = []

					data.items.forEach( song => {
						if( !song.id )
							return
							
						songs.push( new Song(
							song.id.videoId ?? song.id,
							song.author.name.replace( '`', "'" ), //song.snippet.channelTitle.replace( '`', "'" ),
							song.title.replace( '`', "'" ) //song.snippet.title.replace( '`', "'" )
						))
					})

					callback?.( songs )
				})
				.catch( err => errcallback?.( err ) )
			*/

			maxResCntOverride = typeof maxResCntOverride === 'number' ? maxResCntOverride : maxResCnt
			let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResCntOverride}&q=${encodeURI(q)}&key=${ytapikey}`
			
			httpGet( url, body => {
				body = JSON.parse( body )

				if( !body || !body.items || !body.items[0] ){
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

		async function join( voiceChannel, textChannel, callback, message = null ){
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
			callback = callback ?? ( () => {} )

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
			if( !song ){
				song = mdata[guild.id].queue[0]
				if( !song ) return false
			}
			
			if( song instanceof Song )
				song = song.vid
			
			if( typeof song === 'string' ){
				if( /^[\w_-]{11}$/.test( song ) )
					song = await ytdl( 'https://youtu.be/' + song ) // { filter: 'audioonly' }
				else if( /^https?:\/\/(\w+\.)youtu\.?be(\w+)\/.{11,}$/.test( song ) )
					song = await ytdl( song ) // { filter: 'audioonly' }
				else
					return false
			}
			
			mdata[guild.id].disp?.broadcast.end()

			if( guild?.voice.connection ){
				mdata[guild.id].disp = guild.voice.connection.play( song, { type: 'opus' } )
					.on( 'start', () => {
						sendNowPlaying( mdata[guild.id].tc, mdata[guild.id].queue[0] )
						mdata[guild.id].playing = true
					})
					.on( 'finish', () => {
						if( mdata[guild.id].playing ){
							if( mdata[guild.id].queue.shift() && mdata[guild.id].queue[0] )
								play( guild )
							else
								mdata[guild.id].playing = false
						}
					})
					.on( 'error', err => {
						mdata[guild.id].playing = false
						
						console.log( '\nMusic error happened:\n' )
						console.error( err )
						console.log()

						mdata[guild.id].tc?.send( 'An error occurred :(' )
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
		
			if( !mdata[message.guild.id].playing || !mdata[message.guild.id]?.disp.broadcast )
				play( message.guild )
		}

		function skip( guild ){
			const data = mdata[guild.id]

			if( data?.disp.broadcast ){
				const skipped_song = data.queue[data.queue.length - 1]
				mdata[guild.id].disp.broadcast.end()
				return skipped_song
			}

			return data.queue.shift()
		}

		function stop( guild ){
			mdata[guild.id].playing = false
			if( mdata[guild.id]?.disp.broadcast )
				mdata[guild.id].disp.broadcast.end()
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
		async ( msg, args ) => {
			if( args[0] ){
				queue( args.get_string(), msg )
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
		async ( msg, args ) => {
			if( args[0] ){
				queue( args.get_string(), msg ).then( succes => {
					if( !succes ) return
					let queue = mdata[msg.guild.id].queue
					if( queue && queue[0] ) play2( msg )
				})
			} else
				sendQueue( msg )
		})

		addMCommand( 'skip s', `Skips song (doesn't work ¯\\_(ツ)_/¯)`, async ( msg, args ) => {
			let skipped_song = skip( msg.guild )
			msg.send( Embed().addField( 'Skipped:', `\`${skipped_song.author}\` - \`${skipped_song.title}\`` ) )
		})

		addMCommand( 'stop st', 'Stops music', async msg => {
			await stop( msg.guild )
			msg.send( 'Music stopped' )
		})

		/// Main music command ///
		addCmd({
			aliases: 'music m',
			description: {
				short: 'plays music from youtube [currently broken]',
				full: [
					'*TODO*',
				],
			},
			callback: ( msg, args ) => {
				let option = args[0]

				if( m[option] ){
					// Aliases Redirection
					if( typeof m[option] == 'string' )
						option = m[option]
					option = m[option]

					args.shift()
					
					if( typeof option.func == 'function' )
						option.func( msg, args )
					else
						log( `Error: m.${option}.func is a ${typeof option.func}, function expected` )
				} else {
					let emb = Embed()
						.setAuthor( msg.member.displayName, msg.author.avatarURL )
					
					for( let cmd in m ){
						let data = m[cmd]
						if( typeof data === 'object' )
							emb.addField( `**${cmd}${data.aliases.length > 0 ? ', ' + data.aliases.join( ', ' ) : ''}**`, data.description || 'no description :(' )
					}

					msg.send( emb )
				}
			},
		})
	}
}