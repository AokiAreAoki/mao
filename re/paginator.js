const discord = require( 'discord.js' )
const clamp = ( num, min, max ) => num < min ? min : num > max ? max : num

class Paginator {
	/// Static ///
	static buttonRows = [
		[ // first row
			{ // prev page
				id: `left`,
				label: `Prev`,
				emoji: `⬅️`,
			},
			{ // set page
				id: `set`,
				label: `Set page`,
				emoji: `🔢`,
			},
			{ // next page
				id: `right`,
				label: `Next`,
				emoji: `➡️`,
			},
		],
		[ // second row
			[ // toggle lock
				// button switcher
				( paginator, buttons ) => buttons[Number( paginator.authorOnly )],
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
		],
	]

	static {
		function makeButtons( button ){
			if( button instanceof Function )
				return button

			if( button instanceof Array ){
				const buttons = button.map( makeButtons )

				if( buttons[0] instanceof Function )
					buttons.choose = buttons.shift()

				return buttons
			}

			return new discord.ButtonBuilder()
				.setCustomId( button.id )
				.setLabel( button.label )
				.setEmoji( button.emoji )
				.setStyle( button.style ?? discord.ButtonStyle.Secondary )
		}

		Paginator.buttonRows = makeButtons( Paginator.buttonRows )
	}

	static setClient( client ){
		client.on( discord.Events.InteractionCreate, i => {
			if( i.isButton() )
				i.message.paginator?._react(i)
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

		this.setMessage( await channel.send( this.getPageContent() ), false )
		return this
	}

	setMessage( message, _isExternalMessage = true ){
		this.message = message
		message.paginator = this

		if( _isExternalMessage )
			message.edit( this.getPageContent() )

		message.edit({ components: this.getButtons() })
		return this
	}

	// Runtime methods
	async _react( interaction ){
		if( !( interaction instanceof discord.ButtonInteraction ) ) return
		if( this.stopped ) return
		if( interaction.member.bot ) return

		switch( interaction.customId ){
			default:
				console.log( `Interaction with unknown custom ID: "${interaction.customId}"` )
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

			case `set`: {
				if( this._cantChangePages( interaction ) )
					return

				if( this.waiter && !this.waiter.finished )
					return interaction.deferUpdate()

				const removeWaiter = () => delete this.waiter
				const ref = await this.message.getReferencedMessage()
					.then( m => m ?? this.message )

				this.waiter = ref.awaitResponse({
					user: interaction.member.user,
					displayMessage: await ref.send( `Enter a page number:`, 0 ),
				})
					.if( msg => /^\d+$/.test( msg.content ) )
					.then( async ( msg, waiter ) => {
						this.page = clamp( parseInt( msg.content ), 1, this.pageAmount ) - 1
						this.updatePage()
						waiter.stop()
						msg.channel.purge( [msg, waiter.displayMessage], 2 )
					})
					.onCancel( removeWaiter )
					.onTimeout( removeWaiter )

				interaction.deferUpdate()
				break
			}

			case `lock`:
			case `unlock`:
				if( interaction.member.id !== this.user.id )
					return interaction.reply({
						content: 'Only the initiator is able to toggle the lock',
						ephemeral: true,
					})

				this.authorOnly = !this.authorOnly

				interaction.update({
					components: this.getButtons(),
				})
				break

			case `stop`:
				if( interaction.member.id !== this.user.id )
					return interaction.reply({
						content: 'Only the initiator is able to stop the pager',
						ephemeral: true,
					})

				interaction.deferUpdate()
				this.stop()
				break
		}
	}

	_cantChangePages( interaction ){
		const cant = this.authorOnly && interaction.member.id !== this.user.id

		if( cant )
			interaction.reply({
				content: `The initiator has locked the pager therefore you can't interact with it`,
				ephemeral: true,
			})

		return cant
	}

	getPageContent(){
		return this.pageChangeHandler( this.page, this.pageAmount )
	}

	getButtons(){
		return Paginator.buttonRows
			.map( buttons => new discord.ActionRowBuilder().addComponents(
				buttons.map( button => button instanceof Array
					? button.choose( this, button )
					: button
				)
			))
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
		this.waiter?.cancel()
		this.stopped = true
	}
}

module.exports = Paginator
