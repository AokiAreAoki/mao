// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const discord = require( 'discord.js' )
		const client = require( '@/instances/client' )
		const bakadb = require( '@/instances/bakadb' )
		const { Gelbooru, Yandere } = require( '@/instances/booru' )
		const checkTypes = require( '@/functions/checkTypes' )
		const timer = require( '@/re/timer' )

		bakadb.db.dag ??= {
			GMT: 3,
			postAt: 21,
		}

		const sources = {
			gelbooru: Gelbooru,
			yandere: Yandere,
		}

		//// db schema ////
		// eslint-disable-next-line no-unused-vars
		const schema = {
			dag: {
				postAt: 21,
				GMT: 3,
				lastPost: '<day>',
				delay: 1337,
				dailies: [
					//...
					{
						title: '<daily title>',
						tags: '<tags>',
						source: 'gelbooru' | 'yandere',
						guild: '<guild id>',
						channel: '<channel id>',
						thread: true | false,
						history: [
							//...
							{
								day: '<day>',
								channel: '<channel id>',
								message: '<message id>',
							},
							//...
						],
					},
					//...
				],
			},
		}
		//// //// ////

		const DAG = {
			// settings
			setPostAt( timeH ){
				bakadb.set( 'dag/postAt', timeH )
				bakadb.set( 'dag/lastPost', this.currentDay() )
				bakadb.save()
			},
			setGMT( gmt ){
				bakadb.set( 'dag/GMT', gmt )
				bakadb.set( 'dag/lastPost', this.currentDay() )
				bakadb.save()
			},

			// converters
			get offset(){
				const GMT = bakadb.get( 'dag/GMT' ) ?? 0
				const postAt = bakadb.get( 'dag/postAt' ) ?? 0
				return ( GMT - postAt ) * 3600e3
			},
			currentDay( date = Date.now() ){
				return Math.floor( ( Number( date ) + this.offset ) / 86400e3 )
			},
			dayToDate( day ){
				return day
					? day * 86400e3
					: Date.now() - ( Date.now() + this.offset ) % 86400e3
			},

			// filter
			params: [
				'title',
				'guild',
				'channel',
				'tags',
				'source',
				'thread',
			],
			getDailies( filter ){
				if( typeof filter !== 'object' )
					throw TypeError([
						"no `filter` specified",
						"pass an object containing filter settings",
						"or a `null` to post all dailies",
						"",
					].join( '\n\t' ) )

				const dailies = bakadb.fallback({
					path: 'dag/dailies',
					defaultValue: [],
				})

				if( filter === null )
					return dailies

				return dailies.filter( daily => {
					return this.params.every( param => {
						const fp = filter[param]
						if( fp == null )
							return true

						const dp = daily[param]
						return typeof dp === 'string'
							? dp.indexOf( fp ) !== -1
							: dp === fp
					})
				})
			},

			// add daily
			addDaily({
				title,
				guild,
				channel,
				tags,
				source,
				thread,
			}){
				checkTypes( { title }, 'string' )
				checkTypes( { tags }, 'string' )
				checkTypes( { source }, 'string' )
				checkTypes( { guild }, discord.Guild )
				checkTypes( { channel }, discord.TextChannel )
				checkTypes( { thread }, 'boolean' )

				const dailies = bakadb.fallback({
					path: 'dag/dailies',
					defaultValue: [],
				})

				dailies.push({
					title,
					tags,
					source,
					guild,
					channel,
					thread,
					history: []
				})

				bakadb.save()
			},

			// posting tree
			buildTree( filter ){
				const dailies = this.getDailies( filter )
				const guilds = {}

				for( const daily of dailies ){
					const guild = client.guilds.resolve( daily.guild )
					const channel = client.channels.resolve( daily.channel )

					if( !guild || !channel )
						continue

					guilds[guild.id] ??= {
						guild,
						channels: {},
					}

					guilds[guild.id].channels[channel.id] ??= {
						channel,
						dailies: [],
					}

					guilds[guild.id].channels[channel.id].dailies.push( daily )
				}

				return guilds
			},

			// post
			async post( filter, refetchPosted = false ){
				console.log( 'Posting dailies...' )

				const today = this.currentDay()
				const guilds = this.buildTree( filter )

				let index = 0
				const totalDailies = this.getDailies( filter ).length

				for( const gid in guilds ){
					const {
						// guild,
						channels,
					} = guilds[gid]

					for( const cid in channels ){
						const {
							channel,
							dailies,
						} = channels[cid]

						if( dailies.length === 0 )
							return

						const delay = bakadb.fallback({
							path: 'dag/delay',
							defaultValue: 0,
						})

						const postDaily = async daily => {
							let minDelay = Promise.resolve()

							function logProgress( text ){
								console.log( `- [${++index}/${totalDailies}] ${text}` )
							}

							async function getContent( post ){
								minDelay = new Promise( resolve => setTimeout( resolve, delay ) )
								post = await post

								if( !( daily.history instanceof Array ) )
									daily.history = []

								const content = {
									content: null,
									embeds: [
										post.embed({ linkTitle: `Daily ${daily.title}` }),
									],
								}

								return content
							}

							daily.history = daily.history.filter( entry => entry.day === today )
							const lastEntry = daily.history?.pop()
							let message

							if( lastEntry )
								message = await client.channels.resolve( lastEntry.channel )
									?.messages.fetch( lastEntry.message )
									.then( async m => {
										if( refetchPosted ){
											logProgress( `re-fetching...` )
											return m.edit( await getContent( this.fetch( daily, today ) ) )
										}

										logProgress( `skipped.` )
										return m
									})
									.catch( () => null )

							if( !message ){
								logProgress( `fetching...` )
								message = await channel.send( await getContent( this.fetch( daily, today ) ) )
							}

							const entry = {
								day: today,
								channel: channel.id,
								message: message.id,
							}

							if( lastEntry )
								daily.history.forEach( async entry => {
									await client.channels.resolve( lastEntry.channel )
										.messages.fetch( lastEntry.message )
										.then( m => m.delete() )

									daily.history.splice( daily.history.indexOf( entry ), 1 )
									bakadb.save()
								})

							daily.history.push( entry )
							bakadb.save()
							return minDelay
						}

						dailies.reduce( async ( prevMessage, daily ) => {
							await prevMessage
							await postDaily( daily )
								.catch( err => {
									process.emit( `unhandledRejection`, err )
								})
						}, Promise.resolve() )
					}
				}
			},

			// undo
			async undo( filter ){
				const today = this.currentDay()

				return this
					.getDailies( filter )
					.map( daily => {
						if( !daily.history )
							daily.history = []

						return {
							global: daily.history,
							canceled: daily.history.filter( entry => entry.day === today ),
						}
					})
					.reduce( async ( prev, { global, canceled } ) => {
						await prev
						await canceled.reduce( async ( prev, entry ) => {
							await prev

							const channel = client.channels.resolve( entry.channel )
							await channel.messages.fetch( entry.message )
								.then( m => m.delete() )
								.catch( () => {} )

							global.splice( global.indexOf( entry ), 1 )
							bakadb.save()
						}, Promise.resolve() )
					}, Promise.resolve() )
			},

			// fetch
			async fetch( { tags, source }, today ){
				const booru = sources[source]

				if( !booru )
					throw Error( `Unknown source \`${source}\`` )

				const response = await booru.posts( tags )
				const pic = this.findBestDaily( response.pics, today )
				return pic
			},

			// find best daily
			findBestDaily( pics, today ){
				const startOfTheDay = this.dayToDate( today )

				const todaily = pics.filter( pic => {
					const postedAt = new Date( pic.created_at )
					return startOfTheDay > postedAt && startOfTheDay - postedAt < 86400e3
				})

				if( todaily.length !== 0 )
					// Choose a pic with the best score or else the first one
					return todaily.reduce( ( final_pic, cur_pic ) => final_pic.score < cur_pic.score ? cur_pic : final_pic, pics[0] )

				return pics.length === 0
					? null
					: pics[Math.floor( Math.random() * pics.length )]
			},
		}

		module.exports = DAG

		// Poster
		client.once( discord.Events.ClientReady, check )

		client.on( discord.Events.ShardReady, () => {
			timer.create( 'daily_anime_girls', 30, 0, check )
		})

		client.on( discord.Events.Invalidated, () => {
			timer.remove( 'daily_anime_girls' )
		})

		async function check(){
			const today = DAG.currentDay()

			if( bakadb.get( 'dag/lastPost' ) === today )
				return

			bakadb.set( 'dag/lastPost', today )
			bakadb.save()
			DAG.post( null )
		}
	}
}
