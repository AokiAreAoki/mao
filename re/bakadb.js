const fs = require( 'fs' )
const join = require( 'path' ).join
const events = require( 'events' )

const log = console.log
const exists = fs.existsSync
var request

class BakaDB extends events {
	constructor(){
		super()
		this.backups_limit = 10
		this.default_coders = {
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
	}

	init( path, shit ){
		if( typeof path != 'string' ){
			if( typeof path == 'object' )
				for( let k in path ) global[k] = path[k]
			//shit = path
			path = './bdb'
		} else
			for( let k in shit ) global[k] = shit[k]
		
		this.path = path.replace( /^(?!\.[\/\\])[\/\\]?([\w\s_-]+)(?!:)/, './$1' )
		let data = {}

		if( exists( path ) ){
			let saves = fs.readdirSync( path )

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
					data = JSON.parse( fs.readFileSync( join( path, String( file ) ) ).toString() )
					this.emit( 'save-parsed', path, file )
					break
				} catch( error ){
					this.emit( 'error-parsing-save', path, file, error )
				}
			}
		} else
			fs.mkdirSync( path )

		this.coders = this.default_coders
		if( data.coders )
			this._foreach( data.coders, ( coder, type ) => this.coders[type] = this._decode( coder ) )

		this.db = data.db ? this._decode( data.db ) : {}

		process.on( 'exit', () => this.save() )

		this.emit( 'initialized' )
		return true
	}

	get( ...path ){
		let props = [],
			value = this.db
			
		path.forEach( key => key.split( /[\/\.]+/ ).forEach( key => {
			if( key ) props.push( key )
		}))

		for( let i = 0; i < props.length; ++i ){
			let prop = props[i]
			if( !prop ) continue
			
			if( typeof value[prop] === 'undefined' )
				return
			
			value = value[prop]
		}

		if( value === this.db )
			return

		return value
	}

	set( ...path ){
		let props = [],
			value = path.pop(),
			object = this.db
			
		path.forEach( key => key.split( /[\/\.]+/ ).forEach( key => {
			if( key ) props.push( key )
		}))

		let key = props.pop()

		for( let i = 0; i < props.length; ++i ){
			let prop = props[i]
			if( !prop ) continue
			
			if( typeof object[prop] === 'undefined' )
				object[prop] = {}
			
			object = object[prop]
		}

		object[key] = value
	}

	delete( ...path ){
		let props = []
			
		path.forEach( key => key.split( /[\/\.]+/ ).forEach( key => {
			if( key ) props.push( key )
		}))

		this._delete( this.db, props )
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

	googleCloud( api_key, access_token, path_to_request ){ // later // maybe
		/*this.api_key = api_key
		this.access_token = access_token
		
		if( path_to_request )
			request = require( join( path_to_request, 'request' ) )
		else
			try {
				request = require( '../node_modules/request' )
			} catch( err ){
				console.error( err )
				return false
			}

		request.get( 'https://www.googleapis.com/drive/v3/about', {
			
		}, ( error, res, body ) => {
			if( error ){
				console.error(error)
				return
			}
			
			console.log( `statusCode: ${res.statusCode}` )
			console.log( body )
		})

		return true*/
		return false
	}

	_foreach( table, cb ){
		if( table instanceof Array )
			table.forEach( cb );
		else
			for( let k in table )
				cb( table[k], k );
	}

	_encode( table, _path='/' ){
		let encoded
		
		if( table instanceof Array )
			encoded = []
		else if( table instanceof Object )
			encoded = {}
		else
			return this._encodeValue( val, _path )

		this._foreach( table, ( val, k ) => {
			encoded[k] = this._encodeValue( val, _path )
		})

		return encoded
	}

	_decode( table, _path='/' ){
		let decoded
		
		if( table instanceof Array )
			decoded = []
		else if( table instanceof Object )
			decoded = {}
		else
			return this._decodeValue( table, _path )
		
		this._foreach( table, ( val, k ) => {
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
			this.emit( 'missing-encoder', type, join( _path, k ) )
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
				this.emit( 'missing-decoder', type, join( _path, k ) )
		} else if( typeof val === 'object' )
			return this._decode( val )
	}

	save(){
		this.emit( 'save' )

		try {
			let data = this._encode({
				db: this.db,
				coders: this.coders,
				separator: this.separator,
			})

			let json = JSON.stringify( data )
			fs.writeFileSync( join( this.path, String( Date.now() ) ), json )

			this.lastSave = Date.now()
			this.emit( 'saved' )
		} catch( error ){
			this.emit( 'error-saving', error )
		}

		let saves = fs.readdirSync( this.path )

		saves.forEach( ( file, k ) => {
			if( file.match( /\D/ ) )
				delete saves[k]
			else
				saves[k] = Number( file )
		})

		saves.sort( ( a, b ) => b - a )
		let counter = 0

		for( let k in saves )
			if( ++counter > this.backups_limit )
				fs.unlinkSync( join( this.path, String( saves[k] ) ) )
	}

	createCoder( constructor, encoder, decoder ){
		constructor = typeof constructor == 'string' ? constructor : ( typeof constructor == 'function' ? constructor : constructor.constructor ).name
		this.coders[constructor] = {
			encode: encoder,
			decode: decoder,
		}
		this.emit( 'coder-created', constructor, this.coders[constructor] )
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
				}, 1337 )
		} else {
			clearInterval( this.timer )
			delete this.timer
		}
	}
}

if( process.argv[2] && process.argv[2].toLowerCase() === 'debug' ){
	const bakadb = new BakaDB()
	bakadb.init( './testdb' )
	bakadb._debugmode = true

	console.log( 'Google Cloud:',
		bakadb.googleCloud( '', '630478585130-gj13t2lll1uaovlub3gqngujdlt3kp91.apps.googleusercontent.com' )
	)
}

module.exports = new BakaDB()