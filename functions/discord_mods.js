module.exports = {
	requirements: 'discord cb tts',
	evaluations: {
		Jimp: 'Jimp ?? null'
	},
	init: ( requirements, mao ) => {
		requirements.define( global )

		const ending = '\n...'

		function cutIfLimit( message ){
			if( typeof message === 'string' && message.length > 2000 ){
				const cb = message.matchFirst( /```$/ ) || ''
				message = message.substring( 0, 2000 - ending.length - cb.length ) + ending + cb
			} else if( typeof message === 'object' && message !== null )
				message.content = cutIfLimit( message.content )

			return message
		}

		function handleArgs( content, options = {} ){
			options.embeds ??= []
			options.files ??= []
			options.allowedMentions ??= {}
			options.allowedMentions.repliedUser ??= false

			if( typeof content === 'object' ){
				switch( content?.constructor ){
				/*case Array:
					options.content = tts( content, 1 )
					options.cb = true
					break*/

				case discord.MessageEmbed:
					options.embeds = [content]
					break

				case Jimp:
					content.getBuffer( Jimp.MIME_JPEG, ( err, buffer ) => {
						if( err )
							options.embeds.push( Embed()
								.setColor( 0xFF0000 )
								.setDescription( 'Looks like i got to send a picture but something went wrong' )
								.addField( 'Error:', cb( err ) )
							)
						else
							options.files.push( buffer )
					})
					break

				default:
					options = content
					options.allowedMentions ??= {}
					options.allowedMentions.repliedUser ??= false
					break
				}
			} else
				options.content = String( content )

			if( options.cb ){
				options.content = cb( options.content )
				delete options.cb
			}
			
			return cutIfLimit( options )
		}
		
		/// TextChannel ///
		// TextChannel.send
		discord.TextChannel.prototype.original_send = discord.TextChannel.prototype.send
		discord.TextChannel.prototype.send = function( content, options ){
			this.sendTyping()
			return this.original_send( handleArgs( content, options ) )
		}
		
		// TextChannel.sendcb
		discord.TextChannel.prototype.sendcb = function( content, options ){
			options = handleArgs( content, options )
			options.content = cutIfLimit( cb( options.content ) )
			return this.original_send( options )
		}

		/// Message ///
		// Message.reply
		discord.Message.prototype.original_reply = discord.Message.prototype.reply
		discord.Message.prototype.reply = function( content, options, mention = false ){
			if( typeof options === 'boolean' ){
				mention = options
				options = {}
			}

			options = handleArgs( content, options )
			options.allowedMentions.repliedUser = !!mention

			return this.original_reply( options )
				.then( m => {
					this.mentionRepliedUser = mention

					if( this._answers instanceof Array )
						this._answers.push(m)

					return m
				})
		}

		// Message.sendcb
		discord.Message.prototype.sendcb = function( content, options, replyLvl ){
			return this.send( content, options, replyLvl, true )
		}

		// Message.send
		discord.Message.prototype.send = function( content, options = {}, replyLvl = 1, cb = false ){
			this.channel.sendTyping()

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
					if( this._answers instanceof Array )
						this._answers.push(m)

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
				
			if( typeof timeout === 'number' ){
				await new Promise( resolve => setTimeout( () => resolve(), timeout ) )
			
				if( this.deleted )
					return this
			}
				
			return await this.original_delete()
				.then( msg => {
					msg.deleted = true
					return msg
				})
		}

		// Message.toString: url to message instead of its content
		discord.Message.prototype.toString = function(){
			return this.url
		}

		// GuildMemberManager.find: finds single member
		discord.GuildMemberManager.prototype.find = async function( name ){
			return ( await this.fetch({ query: name }) ).first()
		}

		// advanced setActivity
		let repeat,
			quota = 0,
			quotaReset = 0,
			lastRequest = 0

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
	}
}
