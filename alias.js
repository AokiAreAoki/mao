const fs = require( 'fs' )
const YAML = require( 'yaml' )

global.alias = function( original_require ){
	function aliasedRequire( path ){
		path = path.startsWith( '@/' )
			? __dirname + path.substring(1)
			: path

		if( path.endsWith( '.yml' ) || path.endsWith( '.yaml' ) ){
			path = original_require.resolve( path )

			original_require.cache[path] ??= {
				exports: YAML.parse( fs.readFileSync( path, 'utf8' ) )
			}

			return original_require.cache[path].exports
		}

		return original_require( path )
	}

	for( const k in require )
		aliasedRequire[k] = require[k]

	return aliasedRequire
}
