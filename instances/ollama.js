const { Ollama } = require( "ollama" )

const ollama = new Ollama({ host: "http://localhost:11434" });

module.exports = ollama