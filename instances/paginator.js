// eslint-disable-next-line no-global-assign
require = global.alias(require)
const Paginator = require( '@/re/paginator' )
const discord = require( 'discord.js' )
const client = require( '@/instances/client' )

Paginator.setClient( client )

discord.User.prototype.createPaginator = function(){
	return new Paginator( this )
}