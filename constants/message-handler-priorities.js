let index = 0

const MESSAGE_HANDLER_PRIORITIES = {
	COMMAND_MANAGER: ++index,
	EVAL: ++index,
	SED: ++index,
	CURRENCY_CONVERTER: ++index,
	UNIT_CONVERTER: ++index,
	LINK_UTILS: ++index,
	AI: ++index,
	MESSAGE_TRIGGERS: ++index,
}

module.exports = MESSAGE_HANDLER_PRIORITIES