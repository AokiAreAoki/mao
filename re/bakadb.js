const fs = require( 'fs' )
const join = require( 'path' ).join
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

class BakaDB extends events {
	saveThrottle = 100
	backups_limit = 10
	default_coders = {
		Function: {
			encode: func => 'Function:' + String( func ),
			decode: str => eval( str ),
		},
		AsyncFunction: 'Function', //redirect
		RegExp: {
			encode: reg => 'RegExp:' + String( reg ),
			decode: str => eval( str ),
		},
		Array: {
			encode: ( arr, path ) => this._encode( arr, path ),
			decode: ( str, path ) => this._decode( str, path ),
		},
		Object: {
			encode: ( obj, path ) => this._encode( obj, path ),
			decode: ( str, path ) => this._decode( str, path ),
		},
	}

	constructor(){
		super()
	}

	init( path, shit ){
		if( path instanceof Object )
			shit = path

		if( shit instanceof Object )
			for( let k in shit ) global[k] = shit[k]

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

		this.coders = this.default_coders
		if( data.coders )
			this._foreach( data.coders, ( coder, type ) => this.coders[type] = this._decode( coder ) )

		this.db = data.db ? this._decode( data.db ) : {}

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

	_encode( object, _path='/' ){
		let encoded

		if( object instanceof Array )
			encoded = []
		else if( object instanceof Object )
			encoded = {}
		else
			return this._encodeValue( object, _path )

		this._foreach( object, ( val, k ) => {
			encoded[k] = this._encodeValue( val, _path )
		})

		return encoded
	}

	_decode( object, _path='/' ){
		let decoded

		if( object instanceof Array )
			decoded = []
		else if( object instanceof Object )
			decoded = {}
		else
			return this._decodeValue( object, _path )

		this._foreach( object, ( val, k ) => {
			decoded[k] = this._decodeValue( val, _path )
		})

		return decoded
	}

	_encodeValue( val, _path='/' ){
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

		if( typeof coder !== 'undefined' && coder.encode instanceof Function )
			return coder.encode( val, _path )
		else
			this.emit( 'missing-encoder', type, _path )
	}

	_decodeValue( val, _path='/' ){
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

			let coder = this.coders[type]

			// redirect
			if( typeof coder === 'string' )
				coder = this.coders[coder]

			if( typeof coder !== 'undefined' && coder.decode instanceof Function )
				return coder.decode( val, _path )
			else
				this.emit( 'missing-decoder', type, _path )
		} else if( typeof val === 'object' )
			return this._decode( val )
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
			const data = this._encode({
				db: this.db,
				coders: this.coders,
				separator: this.separator,
			})

			const json = JSON.stringify( data )

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
			.slice( this.backups_limit )
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

	createCoder( constructor, encoder, decoder ){
		constructor = this._getConstructorName( constructor )

		this.coders[constructor] = {
			encode: encoder,
			decode: decoder,
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
