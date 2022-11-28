module.exports = function(){
	Set.prototype.merge = function( set ){
		set.forEach( v => this.add(v) )
	}
}