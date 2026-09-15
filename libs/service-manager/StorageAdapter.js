module.exports = class StorageAdapter {
	constructor() {
		if( new.target === StorageAdapter ){
			console.warn( "StorageAdapter is an abstract class and should not be instantiated directly." )
		}

		this.state = {}
	}

	/**
	 * @param {string} name
	 * @returns {boolean}
	 */
	isEnabled( name ){
		return Boolean( this.state[name] )
	}

	/**
	 * @param {string} name
	 * @param {boolean} isEnabled
	 */
	setEnabled( name, isEnabled ){
		this.state[name] = Boolean( isEnabled )
	}
}