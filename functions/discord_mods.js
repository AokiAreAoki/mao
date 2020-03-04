module.exports = {
    requirements: 'discord',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        mao.cb = text => '```\n' + text + '```'

        discord.TextChannel.prototype.sendcb = function( message, options ){
            return this.send( mao.cb( message ), options )
        }
    }
}