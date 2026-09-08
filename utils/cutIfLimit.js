const startEllipsis = '...\n'
const endEllipsis = '\n...'

module.exports = function cutIfLimit( message, limit = 2000, tailMode = false ){
	limit ||= 2000

	if( typeof message === 'string' && message.length > limit ){
		if( tailMode ){
			const cb = message.matchFirst( /^```\w+/ ) || ''
			const contentLimit = limit - startEllipsis.length - cb.length

			message = cb + startEllipsis + message.substring( message.length - contentLimit )
		} else {
			const cb = message.matchFirst( /```$/ ) || ''
			const contentLimit = limit - endEllipsis.length - cb.length

			message = message.substring( 0, contentLimit ) + endEllipsis + cb
		}
	} else if( typeof message === 'object' && message !== null )
		message.content = cutIfLimit( message.content, limit, tailMode )

	return message
}