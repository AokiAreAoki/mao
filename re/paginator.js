
class Paginator {
	/// Static ///
	static discord
	static client
	static emojis = {
		left: '⬅️',
		right: '➡️',
		lock: '🔒',
		stop: '⏹️',
	}

	static init( discord, client ){
		Paginator.discord = discord
		Paginator.client = client

		discord.User.prototype.createPaginator = function(){
			return new Paginator( this )
		}

		client.on( 'messageReactionAdd', ( reaction, user ) => {
			reaction.message.paginator?._react( reaction, user, true )
		})

		client.on( 'messageReactionRemove', ( reaction, user ) => {
			reaction.message.paginator?._react( reaction, user, false )
		})
	}

	/// Instance ///
	page = 0
	pageAmount = null
	timeout = null
	nextChange = 0
	stopped = false
	authorOnly = false

	constructor( user ){
		this.user = user
	}

	// Init methods
	setPages( amount ){
		this.pageAmount = amount
		return this
	}
	
	onPageChanged( pageChangeHandler ){
		if( typeof pageChangeHandler !== 'function' )
			throw Error( `pageChangeHandler must be a function` )

		this.pageChangeHandler = pageChangeHandler
		return this
	}

	async createMessage( channel ){
		if( this.pageAmount == null )
			throw Error( `The page amount is not set` )
			
		if( typeof this.pageChangeHandler !== 'function' )
			throw Error( `The page change handler is not set` )

		const message = await channel.send( this.getPageContent() )
		this.setMessage( message, false )
		return this
	}

	setMessage( message, doUpdatePage = true ){
		this.message = message
		message.paginator = this

		if( doUpdatePage )
			this.updatePage()

		for( const k in Paginator.emojis )
			message.react( Paginator.emojis[k] )

		return this
	}

	// Runtime methods
	_react( reaction, user, addOrRemove ){
		if( this.stopped ) return
		if( reaction.message.id !== this.message.id ) return
		if( user.bot || user.id === Paginator.client.user.id ) return
		if( this.authorOnly && user.id !== this.user.id ) return

		switch( reaction.emoji.toString() ){
			case Paginator.emojis.right:
				if( ++this.page >= this.pageAmount )
					this.page -= this.pageAmount
				
				this.updatePage()
				break

			case Paginator.emojis.left:
				if( --this.page < 0 )
					this.page += this.pageAmount

				this.updatePage()
				break

			case Paginator.emojis.lock:
				if( user.id === this.user.id )
					this.authorOnly = addOrRemove
				break
			
			case Paginator.emojis.stop:
				if( user.id === this.user.id )
					this.stop()
				break
		}
	}

	getPageContent(){
		return this.pageChangeHandler( this.page, this.pageAmount )
	}

	updatePage(){
		if( this.stopped )
			return

		if( this.nextChange > Date.now() ){
			if( !this.timeout )
				this.timeout = setTimeout( () => {
					this.timeout = null
					this.updatePage()
				}, this.nextChange - Date.now() )

			return
		}
			
		this.nextChange = Date.now() + 1337
		const new_content = this.getPageContent()
		
		if( new_content )
			this.message.edit( new_content )
	}

	stop(){
		this.message.reactions.removeAll()
		this.stopped = true
	}
}

module.exports = Paginator