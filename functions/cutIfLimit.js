const ending = '\n...'

module.exports = function cutIfLimit( message, limit = 2000 ){
	if( typeof message === 'string' && message.length > limit ){
		const cb = message.matchFirst( /```$/ ) || ''
		message = message.substring( 0, limit - ending.length - cb.length ) + ending + cb
	} else if( typeof message === 'object' && message !== null )
		message.content = cutIfLimit( message.content )

	return message
}