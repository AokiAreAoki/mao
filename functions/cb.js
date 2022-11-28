const quotes = '```'
module.exports = ( text, lang = '' ) => `${quotes}${lang}\n${text}\n${quotes}`