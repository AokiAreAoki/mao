// eslint-disable-next-line no-global-assign
require = global.alias(require)

const cp = require( "child_process" )
const OutputBuffer = require( "@/re/output-buffer" )

const EXEC_TIMEOUT = 3e3

class FendWrapper {
	/**
	 * @static
	 * @type {string | null}
	 */
	static version = null

	/**
	 * Check if fend is installed and get its version
	 * @static
	 * @returns {string | null} version string or null if not installed
	 */
	static checkVersion() {
		console.log( "" )
		console.log( "[Fend] Checking `fend` installation..." )
		this.version = this.getVersion()

		if( this.version )
			console.log( `[Fend] Installed! (version: ${this.version})` )
		else
			console.log( `[Fend] WARNING: Fend is not installed or not in the PATH!` )

		return this.version
	}

	/**
	 * @static
	 * @returns {string | null} version string or null if not installed
	 */
	static getVersion() {
		const fend = cp.spawnSync( "fend", ["-v"], { timeout: EXEC_TIMEOUT } )

		return fend.status === 0
			? fend.stdout.toString().trim()
			: null
	}

	/**
	 * @static
	 * @readonly
	 * @returns {boolean} true if fend is installed
	 */
	static get isInstalledLocally() {
		return !!this.version
	}

	/**
	 * @static
	 * @param {string} expression expression to evaluate
	 * @returns {Promise<string>} result of the expression
	 */
	static async evaluate(expression) {
		return new Promise( ( resolve, reject ) => {
			const fend = cp.spawn( "fend", ["-e", expression], { timeout: EXEC_TIMEOUT } )
			const output = new OutputBuffer({
				useCodeBlock: false,
				subtractPrettiers: false,
			})

			fend.stdout.on( 'data', chunk => {
				output.pushChunk( chunk )
			})

			fend.stderr.on( 'data', chunk => {
				output.pushChunk( chunk )
			})

			fend.once( 'close', code => {
				if( code === 0 )
					resolve( output.getPretty().trimEnd() )
				else
					reject( new Error( `Fend exited with code ${code}: ${output.getPretty()}` ) )
			})
		})
	}
}

module.exports = FendWrapper