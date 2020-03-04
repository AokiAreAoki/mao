
const fs = require( 'fs' )
const join = require( 'path' ).join
const events = require( 'events' )

var log = console.log
var exists = fs.existsSync

class BakaDB extends events {
	constructor(){
		super()
		
		this.backups_limit = 10
		this.default_coders = {
			Function: {
				encode: func => 'Function:' + String( func ),
				decode: str => eval( str ),
			},
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

	init( path='./bdb' ){
		this.path = path.replace( /^(\.\/)?/, './' )
		let data = {}

		if( exists( path ) ){
			let saves = fs.readdirSync( path )

			saves.forEach( ( file, k ) => {
				if( file.match( /\D/ ) )
					delete saves[k]
				else
					saves[k] = Number( file )
			})

			saves.sort( ( a, b ) => b - a )

			for( let k in saves ){
				let file = saves[k]

				try {
					data = JSON.parse( fs.readFileSync( join( path, String( file ) ) ).toString() )
					this.emit( 'save-parsed', path, file )
					break
				} catch( error ){
					this.emit( 'error-parsing-save', path, file, error )
				}
			}
		} else {
			fs.mkdirSync( path )
		}

		this.coders = this.default_coders

		if( data.coders )
			this._foreach( data.coders, ( coder, type ) => this.coders[type] = this._decode( coder ) )

		this.db = data.db ? this._decode( data.db ) : {}

		if( !this.db.coders ) this.db.coders = {}
		for( let k in this.default_coders )
			this.db.coders[k] = this.default_coders[k]

		process.on( 'exit', () => this.save() )
		
		return true
	}

	_foreach( table, cb ){
		if( table.constructor == Array )
			table.forEach( cb );
		else
			for( let k in table )
				cb( table[k], k );
	}

	_encode( table, _path='/' ){
		let encoded = table.constructor == Array ? [] : {}

		this._foreach( table, ( val, k ) => {
			if( typeof val == 'undefined' || val == null )
				return
			else if( typeof val == 'number' || typeof val == 'boolean' ){
				encoded[k] = val
				return
			} else if( typeof val == 'string' ){
				encoded[k] = 'String:' + val
				return
			}

			let type = val.constructor.name
			let coder = this.coders[type]

			if( typeof coder != 'undefined' )
				encoded[k] = coder.encode( val, _path )
			else
				this.emit( 'missing-encoder', type, join( _path, k ) )
		})

		return encoded
	}

	_decode( table, _path='/' ){
		let decoded = table.constructor == Array ? [] : {}

		this._foreach( table, ( val, k ) => {
			if( typeof val == 'number' || typeof val == 'boolean' ){
				decoded[k] = val
			} else if( typeof val == 'string' ){
				let type = val.match( /^(\w*?):/ )

				if( type )
					type = type[1]
				else {
					this.emit( 'type-not-found', val )
					return
				}
				
				val = val.substring( type.length + 1 )

				if( type == 'String' ){
					decoded[k] = val
					return
				}

				let coder = this.coders[type]

				if( typeof coder != 'undefined' )
					decoded[k] = coder.decode( val, _path )
				else
					this.emit( 'missing-decoder', type, join( _path, k ) )
			} else if( typeof val == 'object' ){
				decoded[k] = this._decode( val )
			}
		})

		return decoded
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

module.exports = new BakaDB()