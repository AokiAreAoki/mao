class Logger {
	static log( ...message ){
		setImmediate( () => {
			console.log( ...message )
		})
	}

	static warn( ...message ){
		setImmediate( () => {
			console.warn( ...message )
		})
	}

	static error( ...message ){
		setImmediate( () => {
			console.error( ...message )
		})
	}

	constructor( prefixes ){
		if( !Array.isArray( prefixes ) )
			prefixes = [prefixes]

		this.prefixes = prefixes
	}

	get prefix() {
		return this._prefix_cache ??= this.prefixes
			.map( v => `[${v}]` )
			.join( ' ' )
	}

	log( ...message ){
		Logger.log( this.prefix, ...message )
	}

	warn( ...message ){
		Logger.warn( this.prefix, ...message )
	}

	error( ...message ){
		Logger.error( this.prefix, ...message )
	}
}

module.exports = Logger