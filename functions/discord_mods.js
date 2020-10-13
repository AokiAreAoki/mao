module.exports = {
	requirements: 'discord cb',
	execute: ( requirements, mao ) => {
		requirements.define( global )
		
		let ending = '\n...'

		discord.TextChannel.prototype.original_send = discord.TextChannel.prototype.send
		discord.TextChannel.prototype.send = function( content, options ){
			if( typeof content === 'string' && content.length > 2000 ){
				let cb = content.matchFirst( /```$/ ) || ''
				content = content.substring( 0, 2000 - ending.length - cb.length )
				content += ending + cb
			}

			return this.original_send( content, options )
		}

		discord.TextChannel.prototype.sendcb = function( message, options ){
			return this.send( cb( message ), options )
		}

		discord.Message.prototype.original_delete = discord.Message.prototype.delete
		discord.Message.prototype.delete = function( timeOrOptions ){
			if( typeof timeOrOptions == 'number' )
				this.original_delete( { timeout: timeOrOptions } )
			else
				this.original_delete( timeOrOptions )
		}

		discord.Message.prototype.send = async function( content, options ){
			let promise = this.channel.send( content, options )
			
			if( typeof this._answers === 'object' && this._answers.constructor === Array )
				promise.then( m => this._answers.push(m) )
			
			return promise
		}
		
		discord.Message.prototype.sendcb = async function( content, options ){
			let promise = this.channel.sendcb( content, options )
			
			if( typeof this._answers === 'object' && this._answers.constructor === Array )
				promise.then( m => this._answers.push(m) )
			
			return promise
		}
		
		discord.Message.prototype.original_reply = discord.Message.prototype.reply
		discord.Message.prototype.reply = function( content, options ){
			let promise = this.original_reply( content, options )
			
			if( typeof this._answers === 'object' && this._answers.constructor === Array )
				promise.then( m => this._answers.push(m) )
			
			return promise
		}
	}
}