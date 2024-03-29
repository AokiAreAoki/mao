// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const cb = require( '@/functions/cb' )
		const axios = require( 'axios' )

		function Language( id, compiler_args ){
			this.id = id
			this.compiler_args = compiler_args
		}

		let langs = {
			'Ada':			new Language( 39 ),
			'Bash':			new Language( 38 ),
			'Brainfuck':	new Language( 44 ),
			'C': {
				'gcc':		new Language( 6, 'source_file.c -o a.out' ),
				'clang':	new Language( 26, 'source_file.c -o a.out' ),
				'vc':		new Language( 29, 'source_file.c -o a.exe' ),
			},
			'C++': {
				'gcc':		new Language( 7, 'source_file.cpp -o a.out' ),
				'clang':	new Language( 27, 'source_file.cpp -o a.out' ),
				'vc++':		new Language( 28, 'source_file.cpp -o a.exe' ),
			},
			'Clojure':		new Language( 47 ),
			'D':			new Language( 30 ),
			'Elixir':		new Language( 41 ),
			'Erlang':		new Language( 40 ),
			'F#':			new Language( 3 ),
			'Fortran':		new Language( 45 ),
			'Go':			new Language( 20 ),
			'Haskell':		new Language( 11 ),
			'Java':			new Language( 4 ),
			'JavaScript':	new Language( 17 ),
			'Kotlin':		new Language( 43 ),
			'Lisp':			new Language( 18 ),
			'Lua':			new Language( 14 ),
			'MySQL':		new Language( 33 ),
			'Nasm':			new Language( 15 ),
			'NodeJS':		new Language( 23 ),
			'ObjectiveC':	new Language( 10 ),
			'Ocaml':		new Language( 42 ),
			'Octave':		new Language( 25 ),
			'Oracle':		new Language( 35 ),
			'Pascal':		new Language( 9 ),
			'Perl':			new Language( 13 ),
			'PHP':			new Language( 8 ),
			'PostgreSQL':	new Language( 34 ),
			'Prolog':		new Language( 19 ),
			'Python':		new Language( 5 ),
			'Python3':		new Language( 24 ),
			'R':			new Language( 31 ),
			'Ruby':			new Language( 12 ),
			'Rust':			new Language( 46 ),
			'Scala':		new Language( 21 ),
			'Scheme':		new Language( 22 ),
			'SqlServer':	new Language( 16 ),
			'Swift':		new Language( 37 ),
			'Tcl':			new Language( 32 ),
			'VB.NET':		new Language( 2 )
		}
		let langList = []

		{
			for( let lang in langs ){
				let compilers = langs[lang]

				lang = {
					lang: lang,
					compilers: [],
				}

				if( compilers )
					for( let compiler in compilers )
						lang.compilers.push( compiler )

				langList.push( lang )
			}

			langList = langList
				.map( l => l.lang + ( l.compilers.length > 0 ? ` (${l.compilers.join( '/' )})` : '' ) )
				.join( ', ' )
		}

		// Aliases
		langs.JS = 'JavaScript'
		langs.CPP = 'C++'

		addCommand({
			aliases: 'rextester rex',
			description: {
				short: 'runs code on rextester.com (dead)',
				full: [
					'Runs code on rextester.com',
					`* doesn't work anymore`
				],
			},
			callback: async ( msg, args ) => {
				if( args.length === 0 )
					return msg.send( `Usage: \`-help ${args[-1]}\`` )

				let arg0 = args[0].toLowerCase()

				if( arg0 === 'list' )
					msg.send( `List of supported languages:\n\`\`\`${langList}\`\`\`` )
				else {
					let language, lang, requestedLang, compiler

					if( arg0.indexOf( '/' ) + 1 )
						[requestedLang, compiler] = arg0.toLowerCase().split( '/' )
					else
						requestedLang = arg0.toLowerCase()

					for( let l in langs ){
						if( l.toLowerCase().startsWith( requestedLang ) ){
							lang = langs[l]

							if( typeof lang === 'string' )
								lang = langs[( l = lang )]

							language = l

							if( lang ){
								compiler = compiler || Object.keys( lang )[0]
								language += ` (${compiler.toUpperCase()})`
								lang = lang[compiler]
							}

							break
						}
					}

					if( lang ){
						let code = args.getRaw(1)

						if( code.startsWith( '```' ) )
							code = code.matchFirst( /```(?:[\w+]+\s+)?(.+)```/s )

						if( !code ){
							msg.send( 'Gimme code, baka~!' )
							return
						}

						let message = await msg.send( `Running your \`${language}\` code...` )

						axios.post( 'https://rextester.com/rundotnet/api', {
							params: {
								LanguageChoice: lang.id,
								Program: code,
								Input: '',
								CompilerArgs : lang.compiler_args || '',
							},
						}).then( ({ data, status, statusText }) => {
							if( status !== 200 )
								return message.edit( cb( statusText ) )

							message.edit( message.content + '\n' // `\n${result.Stats}\n`
								+ ( `Output:${data.Result ? cb( data.Result ) : ' nothing\n'}` )
								+ ( data.Warnings !== null ? 'Warnings:' + cb( data.Warnings ) : '' )
								+ ( data.Errors !== null ? 'Error:' + cb( data.Errors ) : '' )
							)
						})
					} else
						msg.send( `Unknown language \`${requestedLang}\`. \`-rextester list\` - list of languages` )
				}
			},
		})
	}
}