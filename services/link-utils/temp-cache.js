// eslint-disable-next-line no-global-assign
require = global.alias(require)

const binarySearch = require( '@/functions/binarySearch' )

function Entry({
	value,
	key,
	timeout,
	cache,
}){
	this.value = value
	this.key = key
	this.timeout = timeout
	this.cache = cache

	for( const k in this )
		if( this[k] == null && k !== 'value' )
			throw TypeError( `options.${k} must be a valid value` )
}

class TempCache extends Map {
	static globalCache = []

	static sortGlobal(){
		this.globalCache.sort( ( a, b ) => a.timeout < b.timeout )
	}

	static insertGlobal( entry ){
		const insertableIndex = binarySearch( this.globalCache, entry.timeout, v => v.timeout )
		this.globalCache.splice( insertableIndex, 0, entry )
	}

	static removeGlobal( entryToRemove ){
		const insertableIndex = binarySearch( this.globalCache, entryToRemove.timeout, v => v.timeout )

		for( let i = insertableIndex - 1; i >= 0; --i ){
			const entry = this.globalCache[i]

			if( entry === entryToRemove )
				this.globalCache.splice( i, 1 )

			if( entry.timeout < entryToRemove.timeout )
				break
		}
	}

	static {
		setInterval( () => {
			let first

			while( ( first = this.globalCache[0] ) && first.timeout < Date.now() ){
				const deletedEntry = this.globalCache.shift()
				deletedEntry.cache.delete( deletedEntry.key )
			}
		}, 60e3 )
	}

	constructor( cacheTimeout ){
		super()
		this.timeout = cacheTimeout
	}

	set( key, value ){
		let entry = super.get( key )

		if( entry ){
			TempCache.removeGlobal( entry )

			entry.timeout = Date.now() + this.timeout
			entry.value = value
		} else {
			entry = new Entry({
				value,
				key,
				timeout: Date.now() + this.timeout,
				cache: this,
			})

			super.set( key, entry )
		}

		TempCache.insertGlobal( entry )
	}

	get( key ){
		return super.get( key )
	}
}

module.exports = TempCache