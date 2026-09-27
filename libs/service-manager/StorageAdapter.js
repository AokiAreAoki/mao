module.exports = class StorageAdapter {
	constructor() {
		if( new.target === StorageAdapter ){
			console.warn( "StorageAdapter is an abstract class and should not be instantiated directly." )
		}

		this.state = {}
	}

	/**
	 * @returns {string[]}
	 */
	getIds(){
		return Object.keys( this.state )
	}

	/**
	 * @param {string} id
	 * @returns {boolean}
	 */
	isEnabled( id ){
		return Boolean( this.state[id] )
	}

	/**
	 * @param {string} id
	 * @param {boolean} isEnabled
	 */
	setEnabled( id, isEnabled ){
		this.state[id] = Boolean( isEnabled )
	}
}