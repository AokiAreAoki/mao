
class Paginator {
	/// Static ///
	static discord
	static client
	static buttons = [
		{ // prev page
			id: `left`,
			label: `Prev`,
			emoji: `⬅️`,
		},
		{ // next page
			id: `right`,
			label: `Next`,
			emoji: `➡️`,
		},
		[ // toggle lock
			function( paginator, buttons ){
				return buttons[Number( paginator.authorOnly )]
			},
			{ // lock
				id: `lock`,
				label: `Lock buttons`,
				emoji: `🔒`,
			},
			{ // unlock
				id: `unlock`,
				label: `Unlock buttons`,
				emoji: `🔓`,
			},
		],
		{ // stop pager
			id:`stop`,
			label: `Stop`,
			emoji: `⏹️`,
		},
	]

	static init( discord, client ){
		Paginator.discord = discord
		Paginator.client = client

		discord.User.prototype.createPaginator = function(){
			return new Paginator( this )
		}

		client.on( 'interactionCreate', i => {
			if( i.isButton() )
				i.message.paginator?._react(i)
		})

		function buttonify( button ){
			if( button instanceof Function )
				return button

			if( button instanceof Array ){
				const buttons = button.map( buttonify )
				
				if( buttons[0] instanceof Function )
					buttons.choose = buttons.shift()
				
				return buttons
			}

			return new discord.MessageButton()
				.setCustomId( button.id )
				.setLabel( button.label )
				.setEmoji( button.emoji )
				.setStyle( button.style ?? `SECONDARY` )
		}
		
		Paginator.buttons = buttonify( Paginator.buttons )
	}
	
	get buttons(){
		const buttonsRow = new discord.MessageActionRow()
			.addComponents(
				Paginator.buttons.map( button => button instanceof Array
					? button.choose( this, button )
					: button
				)
			)

		return [buttonsRow]
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

		this.setMessage( await channel.send( this.getPageContent() ), false )
		return this
	}

	setMessage( message, isExternalMessage = true ){
		this.message = message
		message.paginator = this

		if( isExternalMessage )
			message.edit( this.getPageContent() )
			
		message.edit({ components: this.buttons })
		return this
	}

	// Runtime methods
	_react( interaction ){
		if( !( interaction instanceof Paginator.discord.ButtonInteraction ) ) return
		if( this.stopped ) return
		if( interaction.member.bot ) return
		
		switch( interaction.customId ){
			default:
				log( `Interaction with unknown custom ID: "${interaction.customId}"` )
				break

			case `right`:
				if( this._cantChangePages( interaction ) )
					return
					
				if( ++this.page >= this.pageAmount )
					this.page -= this.pageAmount
				
				interaction.deferUpdate()
				this.updatePage()
				break

			case `left`:
				if( this._cantChangePages( interaction ) )
					return
					
				if( --this.page < 0 )
					this.page += this.pageAmount

				interaction.deferUpdate()
				this.updatePage()
				break

			case `lock`:
			case `unlock`:
				if( interaction.member.id !== this.user.id )
					return interaction.reply({
						content: 'Only the initiator is able to toggle the lock',
						ephemeral: true,
					})

				this.authorOnly = !this.authorOnly

				interaction.update({
					components: this.buttons,
				})
				break
			
			case `stop`:
				if( interaction.member.id !== this.user.id )
					return interaction.reply({
						content: 'Only the initiator is able to stop the pager',
						ephemeral: true,
					})
				
				this.stop()
				break
		}
	}

	_cantChangePages( interaction ){
		const cant = this.authorOnly && interaction.member.id !== this.user.id
		
		if( cant )
			interaction.reply({
				content: `The initiator has locked the pager therefore you can't change pages`,
				ephemeral: true,
			})

		return cant
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

		this.nextChange = Date.now() + 2e3
		const new_content = this.getPageContent()

		if( new_content )
			this.message.edit( new_content )
	}

	stop(){
		this.message.edit({ components: [] })
		this.stopped = true
	}
}

module.exports = Paginator
