// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init(){
		const discord = require( 'discord.js' )
		const { Collection } = discord
		const client = require( '@/instances/client' )
		const clamp = require( '@/functions/clamp' )
		const Response = require( '@/re/message-manager/response' )
		const cutIfLimit = require( '@/functions/cutIfLimit' )
		const transformMessagePayload = require( '@/functions/transformMessagePayload' )

		/// Collection ///

		// Collection.toArray
		discord.Collection.prototype.toArray = function(){
			return Array.from( this.values() )
		}

		/// EmbedBuilder ///

		// EmbedBuilder.setDescription
		discord.EmbedBuilder.prototype.original_setDescription = discord.EmbedBuilder.prototype.setDescription
		discord.EmbedBuilder.prototype.setDescription = function( description ){
			if( description instanceof discord.GuildEmoji )
				return this.original_setDescription( description.toString() )

			return this.original_setDescription( cutIfLimit( description, 4096 ) )
		}

		// EmbedBuilder.addFields
		discord.EmbedBuilder.prototype.original_addFields = discord.EmbedBuilder.prototype.addFields
		discord.EmbedBuilder.prototype.addFields = function( ...fields ){
			fields = fields.flat(1)

			fields.forEach( field => {
				field.name = cutIfLimit( field.name, 256 )
				field.value = cutIfLimit( field.value, 1024 )
			})

			return this.original_addFields( fields )
		}

		/// TextChannel ///

		// TextChannel.cacheLastMessages
		discord.TextChannel.prototype.cacheLastMessages = async function(){
			const messages = await this.messages.fetch({ limit: 100 })
				.then( msgs => msgs.map( m => m ) )

			for( const msg of messages ){
				const ref = await msg.getReferencedMessage()
				msg.response ??= new Response( msg )

				if( !ref )
					continue

				ref.addAnswer( msg )
			}

			return messages
		}

		// TextChannel.sendTyping
		/** @type {WeakMap<discord.TextChannel, number} */
		const typingCoolDown = new WeakMap()
		discord.TextChannel.prototype.original_sendTyping = discord.TextChannel.prototype.sendTyping
		discord.TextChannel.prototype.sendTyping = async function(){
			const nextTyping = typingCoolDown.get(this)

			if( !nextTyping || nextTyping < Date.now() ){
				typingCoolDown.set( this, Date.now() + 1337 )
				return this.original_sendTyping().catch( () => {} )
			}
		}

		// TextChannel.send
		discord.TextChannel.prototype.original_send = discord.TextChannel.prototype.send
		discord.TextChannel.prototype.send = async function( content, options ){
			await this.sendTyping()
			return this.original_send( transformMessagePayload( content, options ) )
		}

		// TextChannel.bulkDelete
		discord.TextChannel.prototype.original_bulkDelete = discord.TextChannel.prototype.bulkDelete
		discord.TextChannel.prototype.bulkDelete = function( messages ){
			return this.original_bulkDelete( messages ).catch( () => messages )
		}

		// TextChannel.purge
		discord.TextChannel.prototype.purge = async function( messages, delay ){
			if( messages == null )
				return

			delay = typeof delay === 'number'
				? clamp( delay, 0, 300e3 )
				: 0

			if( messages instanceof discord.Collection )
				messages.each( m => m.makeUnpurgable?.( delay ) )
			else
				messages.forEach?.( m => m.makeUnpurgable?.( delay ) )

			if( delay )
				await new Promise( resolve => setTimeout( resolve, delay ) )

			return this.bulkDelete( messages )
		}
		discord.ThreadChannel.prototype.purge = discord.TextChannel.prototype.purge

		/// Message ///

		discord.Message.prototype.addAnswer = function( message ){
			if( !( this._answers instanceof Collection ) )
				this._answers = new Collection()

			this._answers.set( message.id, message )
		}

		// Message.reply
		discord.Message.prototype.original_reply = discord.Message.prototype.reply
		discord.Message.prototype.reply = function( content, options ){
			const transformedOptions = transformMessagePayload( content, options )

			return this.original_reply( transformedOptions )
				.then( m => {
					this.mentionRepliedUser = !!transformedOptions.allowedMentions?.repliedUser
					this.addAnswer(m)
					return m
				})
		}

		// Message.send
		discord.Message.prototype.send = function( content, options = {} ){
			const transformedOptions = transformMessagePayload( content, options )
			const reply = transformedOptions.reply ?? true

			if( reply && !this.deleted )
				return this.reply( transformedOptions )

			return this.channel.send( transformedOptions )
				.then( m => {
					this.addAnswer(m)
					return m
				})
		}

		// Message.edit
		discord.Message.prototype.original_edit = discord.Message.prototype.edit
		discord.Message.prototype.edit = function( content, options = {} ){
			return this.original_edit( transformMessagePayload( content, {
				...options,
				mention: this.mentionRepliedUser
			}))
		}

		// Message.delete
		discord.Message.prototype.original_delete = discord.Message.prototype.delete
		discord.Message.prototype.delete = async function( timeout ){
			if( this.deleted )
				return this

			if( this.deletion )
				return this.deletion

			if( typeof timeout === 'number' ){
				timeout = clamp( timeout, 0, 300e3 )
				await new Promise( resolve => setTimeout( resolve, timeout ) )
				return await this.delete()
			}

			this.deletion = this.original_delete().catch( () => this )
			await this.deletion
			delete this.deletion

			this.deleted = true
			return this
		}

		// Message.makeUnpurgable
		discord.Message.prototype.makeUnpurgable = function( delay ){
			this.unpurgable = Date.now() + 1337 + ( delay || 0 )
		}

		// Message.purge
		discord.Message.prototype.purge = async function( delay ){
			delay = typeof delay === 'number'
				? clamp( delay, 0, 300e3 )
				: 0

			this.makeUnpurgable( delay )
			return this.delete( delay )
		}

		// Message.getReferencedMessage
		discord.Message.prototype.getReferencedMessage = async function(){
			const reference = this.reference

			if( !reference )
				 return null

			return this.reference.message ??= client.guilds.fetch( reference.guildId )
				.then( g => g.channels.fetch( reference.channelId ) )
				.then( c => c.messages.fetch( reference.messageId ) )
				.then( m => this.reference.message = m )
				.catch( () => null )
		}

		// Message.recent
		discord.Message.prototype.recent = async function* () {
			const ref = await this.getReferencedMessage()

			if( ref )
				yield ref

			yield this

			const messages = await this.channel.messages.fetch({
				before: this.id,
				limit: 100,
			})

			for( const message of messages.values() )
				yield message
		}

		// Message.findRecent
		discord.Message.prototype.findRecent = async function( callback ){
			for await( const message of this.recent() ){
				const data = await callback( message )

				if( data )
					return data
			}

			return null
		}

		// Message.findRecentImage
		discord.Message.prototype.findRecentImage = async function(){
			const url = await this.findRecent( message => {
				return message.content.matchFirst(/(https?:\/\/\S+\.(jpe?g|png|webp|gif|bmp))/i)
					|| message.attachments.find(a => a.contentType.indexOf('image') !== -1)?.url
					|| message.embeds.find(e => e.data.image)?.data.image.url
					|| message.embeds.find(e => e.data.thumbnail)?.data.thumbnail.url
			})

			return url || null
		}

		// Message.findRecentVideo
		discord.Message.prototype.findRecentVideo = async function(){
			const url = await this.findRecent( msg => {
				return msg.content.matchFirst( /(https?:\/\/\S+\.(webm|mp4|mkv))/i )
					|| msg.attachments.find( a => a.contentType.indexOf( 'video' ) !== -1 )?.url
					|| msg.embeds.find( e => !!e.video )?.video.url
			})

			return url || null
		}

		// Message.toString: url to message instead of its content
		discord.Message.prototype.toString = function(){
			return this.url
		}

		/// UserManager ///

		// UserManager.find: finds single user
		discord.UserManager.prototype.find = async function( id ){
			if( typeof id === 'number' )
				id = String( id )
			else if( typeof id !== 'string' )
				return null

			id = id.matchFirst( /\d+/ )

			return !id ? null : this.fetch( id )
				.catch( () => null )
		}

		/// GuildMemberManager ///

		// GuildMemberManager.find: finds single member
		discord.GuildMemberManager.prototype.find = async function( query ){
			if( typeof query === 'number' )
				query = String( query )
			else if( typeof query !== 'string' )
				return null

			const id = query.matchFirst( /\d+/ )

			if( id ){
				const memberFetchedByID = await this.fetch( id )
					.catch( () => null )

				if( memberFetchedByID )
					return memberFetchedByID
			}

			return this.fetch({ query: query, limit: 100 })
				.then( members => findMostSuitableMember( members, query ) )
				.catch( () => null )
		}

		function findMostSuitableMember( members, query ){
			if( members.size <= 1 )
				return members.first()

			let member = null

			const matched = matchers.find( matcher => {
				if( member = members.find( matcher( query ) ) )
					return true
			})

			return matched ? member : members.first()
		}

		const matchers = [
			// Exact case sensitive match
			query => ( m => m.user.username === query ),
			query => ( m => m.nickname === query ),

			// Exact case insensitive match
			query => {
				const lowerCaseQuery = query.toLowerCase()
				return m => m.user.username.toLowerCase() === lowerCaseQuery
			},
			query => {
				const lowerCaseQuery = query.toLowerCase()
				return m => m.nickname?.toLowerCase() === lowerCaseQuery
			},

			// Partial case sensitive match
			query => ( m => m.user.username.includes( query ) ),
			query => ( m => m.nickname?.includes( query ) ),

			// Partial case insensitive match
			query => {
				const lowerCaseQuery = query.toLowerCase()
				return m => m.user.username.toLowerCase().includes( lowerCaseQuery )
			},
			query => {
				const lowerCaseQuery = query.toLowerCase()
				return m => m.nickname?.toLowerCase().includes( lowerCaseQuery )
			},
		]

		/// Advanced setActivity
		let repeat
		let quota = 0
		let quotaReset = 0
		let lastRequest = 0

		discord.ClientUser.prototype.original_setActivity = discord.ClientUser.prototype.setActivity
		discord.ClientUser.prototype.setActivity = function( name, options ){
			if( quotaReset < Date.now() ){
				// quota will reset in 20 seconds + 1 second to be sure and compensate the ping
				quotaReset = Date.now() + 21e3
				quota = 0
			}

			let nextRequest = quotaReset - Date.now() + 1

			if( quota < 5 ){
				nextRequest = lastRequest + 3500 - Date.now()

				if( nextRequest < 0 ){
					this.original_setActivity( name, options )
					++quota
					lastRequest = Date.now()
					return true
				}
			}

			clearTimeout( repeat )
			repeat = setTimeout( () => this.setActivity( name, options ), nextRequest )
			return false
		}

		/// Third party emoji resolver
		discord.BaseGuildEmojiManager.prototype.original_resolve = discord.BaseGuildEmojiManager.prototype.resolve
		discord.BaseGuildEmojiManager.prototype.resolve = function( emojiID, data ){
			const emoji = this.original_resolve( emojiID )

			if( emoji )
				return emoji

			if( data ){
				const [, a, name, id] = data.match( /<(a)?:([\w_-]+):(\d+)>/ )
				return new discord.Emoji( client, { animated: !!a, name, id } )
			}
		}
	}
}
