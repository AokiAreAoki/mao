module.exports = function(){
	String.prototype.char = function(){
		return this.charCodeAt()
	}

	Number.prototype.char = function(){
		return String.fromCharCode( this )
	}
}