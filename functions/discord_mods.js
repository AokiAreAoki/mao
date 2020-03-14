module.exports = {
    requirements: 'discord',
    execute: ( requirements, mao ) => {
        requirements.define( global )
        mao.cb = text => '```\n' + text + '```'

        discord.TextChannel.prototype.sendcb = function( message, options ){
            return this.send( mao.cb( message ), options )
        }

        discord.Message.prototype.original_delete = discord.Message.prototype.delete
        discord.Message.prototype.delete = function( timeOrOptions ){
            if( typeof timeOrOptions == 'number' )
                this.original_delete( { timeout: timeOrOptions } )
            else
                this.original_delete( timeOrOptions )
        }
    }
}