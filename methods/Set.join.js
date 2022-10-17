module.exports = function(){
	Set.prototype.join = function(){
		const iter = this.values()
		let flags = iter.next().value

		for( const flag of iter )
			flags += ' ' + flag

		return flags
	}
}