
// eslint-disable-next-line no-global-assign
require = global.alias
module.exports = {
	init(){
		const discord = require( 'discord.js' )
		const { Collection } = discord
		const Jimp = require( 'jimp' )
		const client = require( '@/instances/client' )
		const cb = require( '@/functions/cb' )
		const clamp = require( '@/functions/clamp' )
		const Embed = require( '@/functions/Embed' )
		const Response = require( '@/re/message-manager/response' )

		const ending = '\n...'

		function cutIfLimit( message, limit = 2000 ){
			if( typeof message === 'string' && message.length > limit ){
				const cb = message.matchFirst( /```$/ ) || ''
				message = message.substring( 0, limit - ending.length - cb.length ) + ending + cb
			} else if( typeof message === 'object' && message !== null )
				message.content = cutIfLimit( message.content )

			return message
		}

		function handleArgs( content, options = {} ){
			if( content == null )
				throw new Error( 'content can not be ' + String( content ) )

			if( typeof content === 'object' ){
				switch( content?.constructor ){
					case discord.EmbedBuilder:
						options.embeds = [content]
						break

					case Jimp:
						content.getBuffer( Jimp.MIME_JPEG, ( err, buffer ) => {
							if( err )
								options.embeds.push( Embed()
									.setColor( 0xFF0000 )
									.setDescription( 'Looks like i got to send a picture but something went wrong' )
									.addFields({ name: 'Error:', value: cb( err ) })
								)
							else
								options.files.push( buffer )
						})
						break

					default:
						options = content
						break
				}
			} else {
				options.content = String( content )
			}

			if( options.content || options.embeds || options.files ){
				options.content ??= null
				options.embeds ??= []
				options.files ??= []
			}

			options.allowedMentions ??= {}
			options.allowedMentions.repliedUser ??= false

			if( options.cb ){
				options.content = cb( options.content )
				delete options.cb
			}

			return cutIfLimit( options )
		}

		/// Collection ///

		// Collection.toArray
		discord.Collection.prototype.toArray = function(){
			return Array.from( this.values() )
		}

		/// EmbedBuilder ///

		// EmbedBuilder.setDescription
		discord.EmbedBuilder.prototype.original_setDescription = discord.EmbedBuilder.prototype.setDescription
		discord.EmbedBuilder.prototype.setDescription = function( description ){
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
		discord.TextChannel.prototype.send = function( content, options ){
			return this.sendTyping()
				.then( () => this.original_send( handleArgs( content, options ) ) )
		}

		// TextChannel.sendCB
		discord.TextChannel.prototype.sendCB = function( content, options ){
			options = handleArgs( content, options )
			options.content = cutIfLimit( cb( options.content ) )
			return this.original_send( options )
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

		// Message.reply
		discord.Message.prototype.addAnswer = function( message ){
			if( !( this._answers instanceof Collection ) )
				this._answers = new Collection()

			this._answers.set( message.id, message )
		}

		discord.Message.prototype.original_reply = discord.Message.prototype.reply
		discord.Message.prototype.reply = function( content, options, mention = false ){
			if( typeof options === 'boolean' ){
				mention = options
				options = {}
			}

			mention = Boolean(mention)
			options = handleArgs( content, options )
			options.allowedMentions.repliedUser = mention

			return this.original_reply( options )
				.then( m => {
					this.mentionRepliedUser = mention
					this.addAnswer(m)
					return m
				})
		}

		// Message.sendCB
		discord.Message.prototype.sendCB = function( content, options, replyLvl ){
			return this.send( content, options, replyLvl, true )
		}

		// Message.send
		discord.Message.prototype.send = function( content, options = {}, replyLvl = 1, cb = false ){
			if( typeof options === 'number' ){
				replyLvl = options
				options = {}
			}

			if( cb )
				options.cb = true

			if( replyLvl > 0 && !this.deleted )
				return this.reply( content, options, replyLvl !== 1 )

			return this.channel.send( handleArgs( content, options ) )
				.then( m => {
					this.addAnswer(m)
					return m
				})
		}

		// Message.edit
		discord.Message.prototype.original_edit = discord.Message.prototype.edit
		discord.Message.prototype.edit = function( content, options = {} ){
			options = handleArgs( content, options )
			options.allowedMentions.repliedUser = !!this.mentionRepliedUser
			return this.original_edit( options )
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
			const r = this.reference

			if( !r )
				 return null

			return this.reference.message ??= client.guilds.fetch( r.guildId )
				.then( g => g.channels.fetch( r.channelId ) )
				.then( c => c.messages.fetch( r.messageId ) )
				.then( m => this.reference.message = m )
				.catch( () => null )
		}

		// Message.findLastPic
		discord.Message.prototype.findLastPic = async function(){
			const msgs = await this.channel.messages.fetch({ limit: 100 })
				.then( c => c.toArray() )
				.catch( () => [] )

			msgs.unshift( this )
			await this.getReferencedMessage()
				.then( ref => ref && msgs.unshift( ref ) )

			let url
			for( const msg of msgs ){
				if( url = msg.content.matchFirst( /(https?:\/\/\S+\.(jpe?g|png|webm|gif|bmp))/i ) )
					return url

				if( url = msg.attachments.find( a => a.contentType.indexOf( 'image' ) !== -1 )?.url )
					return url

				if( url = msg.embeds.find( e => !!e.image )?.image.url )
					return url
			}

			return null
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
		discord.GuildMemberManager.prototype.find = async function( name ){
			if( typeof name === 'number' )
				name = String( name )
			else if( typeof name !== 'string' )
				return null

			const id = name.matchFirst( /\d+/ )

			if( id ){
				const memberFetchedByID = await this.fetch( id )
					.catch( () => null )

				if( memberFetchedByID )
					return memberFetchedByID
			}

			return this.fetch({ query: name, limit: 1 })
				.then( members => members.first() )
				.catch( () => null )
		}

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

			const [, a, name, id] = data.match( /<(a)?:([\w_-]+):(\d+)>/ )
			return new discord.Emoji( client, { animated: !!a, name, id } )
		}
	}
}
