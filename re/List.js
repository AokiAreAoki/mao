class List {
    constructor( perms_list ){
        if( perms_list ) this.add( perms_list )
    }

    add( permissions ){
        if( typeof permissions == 'object' && permissions !== null && permissions.constructor == Array )
            permissions.forEach( perm => this[perm] = true )
        else if( typeof permissions == 'string' )
            permissions.toLowerCase().split( /\s+/ ).forEach( perm => this[perm] = true )
    }

    remove( permissions ){
        if( typeof permissions == 'object' && permissions !== null && permissions.constructor == Array )
            permissions.forEach( perm => delete this[perm] )
        else if( typeof permissions == 'string' )
            permissions.toLowerCase().split( /\s+/ ).forEach( perm => delete this[perm] )
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