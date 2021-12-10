class SauceNAO {
	static api_url = `https://saucenao.com/search.php`
	static index_names = {
		 0: `H Magazine`,
		 2: `hcg`,
		 5: `pixiv`,
		 6: `Pixiv Historical`,
		 8: `seiga_illust - nico nico seiga`,
		 9: `Danbooru`,
		10: `Drawr`,
		11: `Nijie`,
		12: `Yande.re`,
		16: `FAKKU`,
		18: `H-MISC (nhentai)`,
		19: `2D Market`,
		20: `Medibang`,
		21: `Anime`,
		22: `H-Anime`,
		23: `Movies`,
		24: `Shows`,
		25: `Gelbooru`,
		26: `Konachan`,
		27: `Sankaku`,
		28: `Anime-Pictures`,
		29: `e621`,
		30: `Idol Complex`,
		31: `bcy.net > illust`,
		32: `bcy.net > cosplay`,
		33: `PortalGraphics`,
		34: `dA`,
		35: `Pawoo`,
		36: `Madokami`,
		37: `MangaDex`,
		38: `H-Misc (ehentai)`,
		39: `ArtStation`,
		40: `FurAffinity`,
		41: `Twitter`,
		42: `Furry Network`,
	}

	constructor( axios, params ){
		this.axios = axios
		this.params = params
	}

	async find( imageURL, log_results = false ){
		const response = await this.axios.get( SauceNAO.api_url, {
			params: {
				...this.params,
				url: imageURL,
			},
		})

		if( log_results )
			console.log( response.data )
		
		if( response.data.header.status != 0 )
			throw Error( response.data.header.message )

		const sauces = response.data.results.map( src => {
			const {
				header,
				data,
			} = src

			header.similarity += '%'
			header.index_name = SauceNAO.index_names[header.index_id] ?? header.index_name
			
			// if( data.ext_urls instanceof Array )
			// 	data.ext_urls = data.ext_urls.join( '\n' )

			if( data.creator instanceof Array )
				data.creator = data.creator.join( ', ' )
				
			return src
		})

		if( log_results )
			console.log( sauces )

		return sauces
	}
}

module.exports = SauceNAO