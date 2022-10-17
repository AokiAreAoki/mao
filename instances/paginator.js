// eslint-disable-next-line no-global-assign
require = global.alias
const Paginator = require( '@/re/paginator' )
const discord = require( 'discord.js' )
const client = require( '@/instances/client' )

discord.User.prototype.createPaginator = function(){
	return new Paginator( this )
}

client.on( 'interactionCreate', i => {
	if( i.isButton() )
		i.message.paginator?._react(i)
})