const quotes = '```'
module.exports = ( text, lang = '' ) => `${quotes}${typeof lang === 'string' ? lang : ''}\n${text}\n${quotes}`