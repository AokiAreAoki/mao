const MOVE_CURSER_LEFT = '\x0D'
const ELLIPSIS = '...'
const CODE_BLOCK_OPEN = '```\n'
const CODE_BLOCK_CLOSE = '```'

module.exports = class OutputBuffer {
	output = ''
	hasOverflowed = false
	useCodeBlock = false
	limit = 1024
	contentLimit = this.limit
	cropTimeout = null

	constructor({ useCodeBlock = true, subtractPrettiers = true } = {}){
		this.useCodeBlock = useCodeBlock
		this.subtractPrettiers = subtractPrettiers
		this.setLimit()
	}

	setLimit( limit = 1024 ){
		this.limit = limit
		this.contentLimit = limit

		if( this.subtractPrettiers ){
			this.contentLimit -= ELLIPSIS.length

			if( this.useCodeBlock ){
				this.contentLimit -= CODE_BLOCK_OPEN.length
				this.contentLimit -= CODE_BLOCK_CLOSE.length
			}
		}

		return this
	}

	pushChunk( chunk ){
		this.output += chunk
		this.cropOutputLater()
		return this
	}

	cropOutputLater(){
		this.cropTimeout ??= setTimeout( () => {
			clearTimeout( this.cropTimeout )
			this.cropTimeout = null
			this.cropOutput()
		}, 250 )
	}

	cropOutput(){
		this.output = this.output
			// eslint-disable-next-line no-control-regex
			.replace( /\u001b\[\??[\d+;]*\w/gi, '' )
			.split( /\r?\n/ )
			.map( line => {
				const overwrites = line.split( MOVE_CURSER_LEFT )
				let finalString = overwrites.at(-1)

				if( !finalString )
					finalString = ( overwrites.at(-2) || overwrites.at(-1) ) + MOVE_CURSER_LEFT

				return finalString
			})
			.join( '\n' )

		if( this.output.length > this.contentLimit ){
			this.hasOverflowed = true
			this.output = this.output.slice( this.output.length - this.contentLimit )
		}
	}

	getPretty(){
		this.cropOutput()
		let output = this.output

		if( this.hasOverflowed )
			output = ELLIPSIS + output

		if( this.useCodeBlock )
			output = CODE_BLOCK_OPEN + output + CODE_BLOCK_CLOSE

		return output
	}
}
