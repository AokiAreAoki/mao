
function listTypes( types ){
	types = types.map( type => type?.name ?? String( type ) )
	const lastType = types.pop()

	if( types.length !== 0 )
		return `${types.join( ', ' )} or ${lastType}`

	return lastType
}

module.exports = function checkTypes( variables, types, throwError = false ){
	if( !( types instanceof Array ) )
		types = [types]

	for( let name in variables ){
		const value = variables[name]
		const nonePass = types.every( type => {
			if( typeof type === 'string' ){
				if( typeof value !== type )
					return true
			} else if( !( value instanceof type ) )
				return true

			return false
		})

		if( nonePass ){
			if( throwError )
				throw TypeError( `arg ${name} expected to be an instance of a ${listTypes( types )}, got ${value?.constructor.name ?? typeof value}` )

			return false
		}
	}

	return true
}