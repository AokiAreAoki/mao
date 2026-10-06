// eslint-disable-next-line no-global-assign
require = global.alias(require)

const MetaDataStore = require( "@/libs/meta-data-store" );
const bakaDB = require("./bakadb");
const client = require("./client");

const PATH = "message-tags"
const TTL = 3 * 24 * 3600e3

const metaDataStore = new MetaDataStore({
	bakaDB,
	client,
	path: PATH,
	ttl: TTL,
})

module.exports = metaDataStore