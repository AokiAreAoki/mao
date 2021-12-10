
class Paginator {
	/// Static ///
	static discord
	static client
	static left = '⬅️'
	static right = '➡️'
	static stop = '⏹️'

	static init( discord, client ){
		Paginator.discord = discord
		Paginator.client = client

		discord.User.prototype.createPaginator = function(){
			return new Paginator( this )
		}

		client.on( 'messageReactionAdd', ( reaction, user ) => {
			reaction.message.paginator?._react( reaction, user )
		})

		client.on( 'messageReactionRemove', ( reaction, user ) => {
			reaction.message.paginator?._react( reaction, user )
		})
	}

	/// Instance ///
	page = 0
	pageAmount = null
	timeout = null
	nextChange = 0
	stopped = false

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

		message.react( Paginator.left )
		message.react( Paginator.right )
		message.react( Paginator.stop )

		return this
	}

	// Runtime methods
	_react( reaction, user ){
		if( this.stopped ) return
		if( reaction.message.id !== this.message.id ) return
		if( user.id !== this.user.id ) return

		switch( reaction.emoji.toString() ){
			case Paginator.right:
				if( ++this.page >= this.pageAmount )
					this.page -= this.pageAmount
				
				this.updatePage()
				break

			case Paginator.left:
				if( --this.page < 0 )
					this.page += this.pageAmount

				this.updatePage()
				break
			
			case Paginator.stop:
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