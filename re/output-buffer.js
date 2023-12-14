const MOVE_CURSER_LEFT = '\x0D'
const ELLIPSIS = '...'
const CODE_BLOCK_OPEN = '```\n'
const CODE_BLOCK_CLOSE = '```'

module.exports = class OutputBuffer {
	output = ''
	limit = 1024
	hasOverflowed = false
	useCodeBlock = false
	cropTimeout = null

	constructor({ useCodeBlock = true, subtractPrettiers = true } = {}){
		this.useCodeBlock = useCodeBlock

		if( subtractPrettiers ){
			this.limit -= ELLIPSIS.length

			if( this.useCodeBlock ){
				this.limit -= CODE_BLOCK_OPEN.length
				this.limit -= CODE_BLOCK_CLOSE.length
			}
		}
	}

	setLimit( limit = 1024 ){
		this.limit = limit
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

		if( this.output.length > this.limit ){
			this.hasOverflowed = true
			this.output = this.output.slice( this.output.length - this.limit )
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
