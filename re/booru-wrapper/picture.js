

module.exports = class Picture {
	constructor( props = {} ){
		for( const key in props )
			this[key] = props[key]
	}
}