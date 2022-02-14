class List {
	constructor( items ){
		if( items )
			this.add( items )
	}

	add( items ){
		if( items instanceof List )
			return this.add( Object.keys( items ) )

		if( items instanceof Array )
			return items.forEach( item => this[item.toLowerCase()] = true )

		if( typeof items === 'string' )
			return items.toLowerCase().trim().split( /\s+/ ).forEach( item => this[item] = true )
	}

	remove( items ){
		if( items instanceof List )
			return this.remove( Object.keys( items ) )

		if( items instanceof Array )
			return items.forEach( item => delete this[item.toLowerCase()] )

		if( typeof items === 'string' )
			return items.toLowerCase().trim().split( /\s+/ ).forEach( item => delete this[item] )
	}

	map( mappingFunction ){
		return Object.keys( this ).map( mappingFunction )
	}

	join( separator ){
		return Object.keys( this ).join( separator )
	}

	pretty(){
		return this
			.map( v => `\`${v}\`` )
			.join( ', ' )
	}

	toString(){
		return this.join( ' ' )
	}
}

module.exports = List