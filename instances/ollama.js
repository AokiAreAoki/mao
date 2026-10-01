// eslint-disable-next-line no-global-assign
require = global.alias( require )

const LLMao = require( '@/libs/llmao' )

module.exports = LLMao.getClient()