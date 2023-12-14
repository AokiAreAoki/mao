
module.exports = class EvalFlagParser {
	constructor( flags ){
		this.flags = new Set( flags )
	}

	parseAndCutFirstFlag( code ){
		let flag = null, value = null

		code.matchFirst( /^\s*([A-Za-z]+)(?:[\s:])/, matched => {
			matched = matched.toLowerCase()

			if( this.flags.has( matched ) ){
				flag = matched
				code = code.trimLeft().substring( flag.length )

				if( code[0] === ':' ){
					value = code.matchFirst( /^.([\w*]+)/ ) ?? ''
					code = code.substring( value.length + 1 )
				}
			}
		})

		return [code, flag, value]
	}

	parseAndCut( code ){
		let flag, value
		const flags = {}

		// eslint-disable-next-line no-constant-condition
		while( true ){
			[code, flag, value] = this.parseAndCutFirstFlag( code )

			if( !flag )
				break

			flags[flag] = { value }
		}

		return [code, flags]
	}
}
