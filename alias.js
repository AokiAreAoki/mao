const fs = require( 'fs' )
const YAML = require( 'yaml' )
const _require = require

global.alias = function( path ){
	path = path.startsWith( '@/' )
		? __dirname + path.substring(1)
		: path

	if( path.endsWith( '.yml' ) || path.endsWith( '.yaml' ) ){
		path = _require.resolve( path )

		_require.cache[path] ??= {
			exports: YAML.parse( fs.readFileSync( path, 'utf8' ) )
		}

		return _require.cache[path].exports
	}

	return _require( path )
}

for( const k in require )
	global.alias[k] = require[k]