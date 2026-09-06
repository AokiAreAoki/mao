const fs = require( 'fs' )
const { join } = require( 'path' )
const events = require( 'events' )
const get = require( 'lodash/get' )
const set = require( 'lodash/set' )

String.prototype.matchFirst = function( re, cb ){
	let matched = this.match( re )
	let string = null

	if( matched ){
		string = matched[1] ?? matched[0]

		if( string && typeof cb === 'function' )
			cb( string )
	}

	return string
}

/**
 * @typedef {Object} BakaDBCoder
 * @property {function(*, string):*} [serialize] Function that serializes a value for storage.
 * @property {function(string, string):*} [deserialize] Function that deserializes a stored string.
 *
 * @typedef {Object.<string, (BakaDBCoder|string)>} BakaDBCoders
 * Coders can be a serializer/deserializer object or a redirect to another coder key.
 *
 * @typedef {Object} BakaDBOptions
 * @property {number} [saveThrottle] Save throttle delay in milliseconds.
 * @property {number} [backupLimit] Number of backup files to keep.
 * @property {BakaDBCoders} [coders] Custom coders to merge with defaults.
 */
class BakaDB extends events {
	defaultCoders = {
		Function: {
			serialize: func => 'Function:' + String( func ),
			deserialize: str => eval( str ),
		},
		AsyncFunction: 'Function', //redirect
		RegExp: {
			serialize: reg => 'RegExp:' + String( reg ),
			deserialize: str => eval( str ),
		},
		Array: {
			serialize: ( arr, path ) => this._serialize( arr, path ),
			deserialize: ( str, path ) => this._deserialize( str, path ),
		},
		Object: {
			serialize: ( obj, path ) => this._serialize( obj, path ),
			deserialize: ( str, path ) => this._deserialize( str, path ),
		},
	}

	/**
	 * @param {BakaDBOptions} [options]
	 */
	constructor({
		saveThrottle = 100,
		backupLimit = 10,
		coders,
	} = {}){
		super()

		this.saveThrottle = saveThrottle
		this.backupLimit = backupLimit
		this.coders = {
			...this.defaultCoders,
			...coders,
		}
	}

	init( path ){
		this.path = ( typeof path === 'string' && path ) ? path.replace( /^(?!\.[/\\])[/\\]?([\w\s_-]+)(?!:)/, './$1' ) : './bdb'
		let data = {}

		if( fs.existsSync( this.path ) ){
			let saves = fs.readdirSync( this.path )

			saves.forEach( ( file, k ) => {
				if( /\D/.test( file ) )
					delete saves[k]
				else
					saves[k] = Number( file )
			})

			saves.sort( ( a, b ) => b - a )

			for( let i = 0; i < saves.length; ++i ){
				let file = saves[i]

				try {
					data = JSON.parse( fs.readFileSync( join( this.path, String( file ) ) ).toString() )
					this.emit( 'save-parsed', this.path, file )
					break
				} catch( error ){
					this.emit( 'error-parsing-save', this.path, file, error )
				}
			}
		} else {
			fs.mkdirSync( this.path, { recursive: true } )
		}

		if( data.coders )
			delete data.coders

		this.db = data.db ? this._deserialize( data.db ) : {}

		process.on( 'exit', () => this.save( true ) )

		this.emit( 'initialized' )
		return true
	}

	get( ...path ){
		return get( this.db, this._resolvePropPath( path ) )
	}

	set( ...path ){
		const value = path.pop()
		const props = this._resolvePropPath( path )
		set( this.db, props, value )
	}

	fallback({ path, defaultValue }){
		if( !( path instanceof Array ) )
			path = [path]

		const value = this.get( ...path )

		if( value === undefined ){
			const value = defaultValue()
			this.set( ...path, value )
			return value
		}

		return value
	}

	delete( ...path ){
		this._delete( this.db, this._resolvePropPath( path ) )
	}

	_delete( object, props ){
		if( props.length === 0 )
			return false

		let key = props.shift()

		if( typeof object[key] !== 'undefined' ){
			if( props.length === 0 )
				delete object[key]
			else {
				if( this._delete( object[key], props ) )
					delete object[key]
			}
		}

		return Object.keys( object ).length === 0
	}

	_foreach( object, cb ){
		if( object instanceof Array )
			object.forEach( cb );
		else
			for( let k in object )
				cb( object[k], k );
	}

	_serialize( object, _path='/' ){
		let serialized

		if( object instanceof Array )
			serialized = []
		else if( object instanceof Object )
			serialized = {}
		else
			return this._serializeValue( object, _path )

		this._foreach( object, ( val, k ) => {
			serialized[k] = this._serializeValue( val, _path )
		})

		return serialized
	}

	_deserialize( object, _path='/' ){
		let deserialized

		if( object instanceof Array )
			deserialized = []
		else if( object instanceof Object )
			deserialized = {}
		else
			return this._deserializeValue( object, _path )

		this._foreach( object, ( val, k ) => {
			deserialized[k] = this._deserializeValue( val, _path )
		})

		return deserialized
	}

	_serializeValue( val, _path='/' ){
		if( typeof val === 'undefined' || val == null )
			return

		if( typeof val === 'number' || typeof val === 'boolean' )
			return val

		if( typeof val === 'string' )
			return 'String:' + val

		let type = val.constructor.name
		let coder = this.coders[type]

		// redirect
		if( typeof coder === 'string' )
			coder = this.coders[coder]

		if( typeof coder !== 'undefined' && coder.serialize instanceof Function )
			return coder.serialize( val, _path )
		else
			this.emit( 'missing-serializer', type, _path )
	}

	_deserializeValue( val, _path='/' ){
		if( typeof val === 'number' || typeof val === 'boolean' )
			return val

		if( typeof val === 'string' ){
			let type = val.match( /^(\w*?):/ )

			if( type )
				type = type[1]
			else {
				this.emit( 'type-not-found', val )
				return
			}

			val = val.substring( type.length + 1 )

			if( type === 'String' )
				return val

			let coder = type
			let redirectsLeft = 5

			while( typeof coder === 'string' ){
				if( --redirectsLeft < 0 ){
					throw Error( `Too many redirects while looking for coder "${type}" (path: "${_path}")` )
				}

				coder = this.coders[coder]
			}

			if( typeof coder !== 'undefined' && coder.deserialize instanceof Function )
				return coder.deserialize( val, _path )

			this.emit( 'missing-deserializer', type, _path )
		} else if( typeof val === 'object' )
			return this._deserialize( val )
	}

	save( force = false ){
		if( !force && Date.now() - this.lastSave < this.saveThrottle ){
			this.saveTimeout ??= setTimeout( () => {
				this.save( true )
				delete this.saveTimeout
			}, this.lastSave + this.saveThrottle - Date.now() )

			return
		}

		this.emit( 'save' )

		try {
			const serializedData = this._serialize({ db: this.db })
			const json = JSON.stringify( serializedData )

			if( !fs.existsSync( this.path ) )
				fs.mkdirSync( this.path, { recursive: true } )

			fs.writeFileSync( join( this.path, String( Date.now() ) ), json )

			this.lastSave = Date.now()
			this.emit( 'saved' )
		} catch( error ){
			this.emit( 'error-saving', error )
		}

		fs.readdirSync( this.path )
			.filter( file => /^\d+$/.test( file ) )
			.map( file => parseInt( file ) )
			.sort( ( a, b ) => b - a )
			.slice( this.backupLimit )
			.forEach( timestamp => {
				fs.unlinkSync( join( this.path, timestamp.toString() ) )
			})
	}

	_getConstructorName( constructor ){
		return typeof constructor === 'string' ? constructor : ( typeof constructor === 'function' ? constructor : constructor.constructor ).name
	}

	_resolvePropPath( path ){
		return path
			.map( p => p.split( /[/.]+/ ) )
			.flat(1)
			.filter( p => !!p )
	}

	createCoder( constructor, serialize, deserialize ){
		constructor = this._getConstructorName( constructor )

		this.coders[constructor] = {
			serialize,
			deserialize,
		}
		this.emit( 'coder-created', constructor, this.coders[constructor] )
	}

	setRedirection( from, to ){
		from = this._getConstructorName( from )
		to = this._getConstructorName( to )
		this.coders[from] = to
	}

	autoSave( seconds ){
		if( Math.abs( seconds ) == Infinity ) return false;
		if( isNaN( seconds ) ) return false;

		this.autoSaveDelay = seconds * 1000

		if( this.autoSaveDelay > 0 ){
			if( typeof this.lastSave != 'number' ) this.lastSave = Date.now()
			this.autoSaveDelay = Math.max( this.autoSaveDelay, 5000 )

			if( !this.timer )
				this.timer = setInterval( () => {
					if( this.lastSave + this.autoSaveDelay < Date.now() )
						this.save()
				}, 5e3 )
		} else {
			clearInterval( this.timer )
			delete this.timer
		}
	}
}

module.exports = BakaDB
