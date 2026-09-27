// eslint-disable-next-line no-global-assign
require = global.alias(require)

const emojiCatalogue = require( '@/utils/emojis' )

/** @typedef {'pending' | 'already' | 'success' | 'fail' | 'idle'} Status */

module.exports = class StatusLine {
	/** @type {Status[]} */
	static STATUS = ['pending', 'already', 'success', 'fail', 'idle']

	/** @type {Status} */
	status = 'pending'

	constructor( message ){
		this.message = message
	}

	/** @param {Status} status */
	setStatus( status ){
		if( !StatusLine.STATUS.includes( status ) )
			throw new Error( `Invalid status: ${status}` )

		this.status = status
	}

	setError( error ){
		this.error = error
	}

	/** @param {Status} status */
	getStatusEmoji( status ){
		switch( status ){
			case 'pending': return '⏳'
			case 'already': return '☑️'
			case 'success': return '✅'
			case 'fail': return '❌'
			case 'idle': return '⚫'
		}
	}

	toString(){
		let status = `${this.getStatusEmoji( this.status )} ${this.message}: ${this.status}`

		if( this.status === 'fail' )
			status += ` (${this.error?.message || this.error})`

		return status
	}
}