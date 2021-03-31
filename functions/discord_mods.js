module.exports = {
	requirements: 'discord cb',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		// send and cut the message if > 2000 chars
		const ending = '\n...'

		discord.TextChannel.prototype.original_send = discord.TextChannel.prototype.send
		discord.TextChannel.prototype.send = function( content, options ){
			if( typeof content === 'string' && content.length > 2000 ){
				let cb = content.matchFirst( /```$/ ) || ''
				content = content.substring( 0, 2000 - ending.length - cb.length ) + ending + cb
			}

			return this.original_send( content, options )
		}

		// send in codeblock
		discord.TextChannel.prototype.sendcb = function( message, options ){
			return this.send( cb( message ), options )
		}

		// old delete
		discord.Message.prototype.original_delete = discord.Message.prototype.delete
		discord.Message.prototype.delete = function( timeOrOptions ){
			if( typeof timeOrOptions == 'number' )
				return this.original_delete( { timeout: timeOrOptions } )
			
			return this.original_delete( timeOrOptions )
		}

		// send and bind to `this` message
		discord.Message.prototype.send = async function( content, options ){
			let promise = this.channel.send( content, options )
			
			if( this._answers instanceof Array )
				promise.then( m => this._answers.push(m) )
			
			return promise
		}
		
		// send in codeblock and bind to `this` message
		discord.Message.prototype.sendcb = async function( content, options ){
			let promise = this.channel.sendcb( content, options )
			
			if( this._answers instanceof Array )
				promise.then( m => this._answers.push(m) )
			
			return promise
		}
		
		// reply and bind to `this` message
		discord.Message.prototype.original_reply = discord.Message.prototype.reply
		discord.Message.prototype.reply = function( content, options ){
			let promise = this.original_reply( content, options )
			
			if( this._answers instanceof Array )
				promise.then( m => this._answers.push(m) )
			
			return promise
		}

		// find single member
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