module.exports = {
	RESPONDING_MESSAGE_OPTIONS: {
		useEvenInterval: true,
		tailMode: true,
	},

	THINKING_MESSAGE_OPTIONS: {
		useEvenInterval: true,
		tailMode: true,
		cb: "markdown",
	},

	/** @type {('high' | 'medium' | 'low')[]} */
	THINK_LEVELS: ['high', 'medium', 'low'],
}