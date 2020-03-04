( msg, args, cmd ) => {
    let data = preg_match_all(/(\s+)?([\w+\d+]+)(\s+)?/gm, cmd.substring(6))
    for(let i = 0; i < data.length; i++)
        data[i] = data[i][2]
    if(data[0] == 'get')
        getManga(isNumberUInt(data[1]) ? data[1] : 'random', manga => {
            let embed = emb()
                            .setURL(manga.url)
                            .setImage(manga.title_img)
                            .setTitle(manga.name.en)
                            .setColor(maoclr)
                            .setAuthor(`${msg.author.username} | ${msg.member.displayName}`, msg.author.avatarURL)

            for(let tag in manga.tags)
            {
                for(let i = 0; i < manga.tags[tag].length; i++)
                    manga.tags[tag][i] = `\`${manga.tags[tag][i]}\``
                let data = ats(manga.tags[tag], null, null, '', '')
                if(data)
                    embed.addField(tag, data, true)
            }

            embed.setFooter(`manga id: ${manga.id} from site https://nhentai.net/`, 'https://cdn.discordapp.com/attachments/454368217792774160/471374450810552330/nhentai_favicon.png')

            msg.channel.send({ embed })
        }, err => msg.channel.send(cb(err)))
    else
        msg.channel.send('Unknown method!~')
}