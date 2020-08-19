class List {
    constructor( items ){
        if( items ) this.add( items )
    }

    add( items ){
        if( items instanceof Array )
            items.forEach( item => this[item.toLowerCase()] = true )
        else if( typeof items === 'string' )
            items.toLowerCase().trim().split( /\s+/ ).forEach( item => this[item] = true )
    }

    remove( items ){
        if( items instanceof Array )
            items.forEach( item => delete this[item.toLowerCase()] )
        else if( typeof items === 'string' )
            items.toLowerCase().trim().split( /\s+/ ).forEach( item => delete this[item] )
    }

    toString(){
        let str = ''

        for( let k in this ){
            if( str ) str += ' '
            str += k
        }

        return str
    }
}

module.exports = List