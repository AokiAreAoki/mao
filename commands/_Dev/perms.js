module.exports = {
	requirements: 'discord bakadb db List maoclr',
	init: ( requirements, mao ) => {
		requirements.define( global )
		
		bakadb.createCoder( List, perms => 'List:' + perms.toString(), list => new List( list ) )

		if( db.perms ){
			for( let k in db.perms ){
				let perms = db.perms[k]

				if( typeof perms != 'object' || perms.constructor != List )
					delete db.perms[k]
				else {
					let empty = true
					
					for( let k in perms ){
						empty = false
						break
					}

					if( empty ) delete db.perms[k]
				}
			}
		} else db.perms = {}

		// addPerm
		discord.User.prototype.addPerm = function( permissions ){
			if( !permissions ) return
			if( db.perms[this.id] ) db.perms[this.id].add( permissions )
			else db.perms[this.id] = new List( permissions )
		}

		discord.GuildMember.prototype.addPerm = function( permissions ){
			this.user.addPerm( permissions )
		}

		// removePerm
		discord.User.prototype.removePerm = function( permissions ){
			if( permissions && db.perms[this.id] )
				db.perms[this.id].remove( permissions )
		}

		discord.GuildMember.prototype.removePerm = function( permissions ){
			this.user.removePerm( permissions )
		}

		// removeAllPerms
		discord.User.prototype.removeAllPerms = function(){
			delete db.perms[this.id]
		}

		discord.GuildMember.prototype.removeAllPerms = function(){
			this.user.removeAllPerms()
		}
		
		// hasPerm
		discord.User.prototype.hasPerm = function( permission ){
			if( !permission ) return
			return db.perms[this.id] && db.perms[this.id][permission.toLowerCase()]
		}

		discord.GuildMember.prototype.hasPerm = function( permission ){
			return this.user.hasPerm( permission )
		}

		// isMaster
		discord.User.prototype.isMaster = function(){
			return this.id == '247028662312894466' || this.hasPerm( 'master' )
		}

		discord.GuildMember.prototype.isMaster = function(){
			return this.user.isMaster()
		}

		async function findMemberID( guild, username ){
			const id = username.matchFirst( /^<@!?(\d+)>$/i )

			if( id )
				return id
			
			const member = await guild.members.find( username )
			return member ? member.id : null
		}

		const cmd = addCmd({
			aliases: 'perm perms',
			description: 'manages bot permissions',
		})

		// Commands
		
		cmd.addSubcommand({
			aliases: 'get',
			description: {
				single: 'displays all permissions',
				usages: [
					['<@@>', 'displays all permissions $1 has'],
				]
			},
			callback: async ( msg, args ) => {
				let username = args.shift()
				
				if( username ){
					let id = await findMemberID( msg, username )

					if( id ){
						let list = '',
							user = client.users.cache.get( id )
						
						if( db.perms[id] )
							for( let k in db.perms[id] )
								if( db.perms[id][k] == true ){
									if( list ) list += ', '
									list += `\`${k}\``
								}
						
						if( list )
							msg.send( `\`${user.tag}\`'s permissions: ` + list )
						else
							msg.send( `User \`${user.tag}\` has no permissions` )
						
						return
					}
				}

				msg.send( 'User not found' )
			},
		})
		
		cmd.addSubcommand({
			aliases: 'set',
			description: {
				single: 'sets permissions for users',
				usages: [
					['<@@>', '<permissions...>', 'sets $2 permissions for $1']
				]
			},
			callback: async ( msg, args ) => {
				let username = args.shift()

				if( args.length > 0 ){
					let id = await findMemberID( msg, username )

					if( id ){
						if( db.perms[id] ) db.perms[id].add( args )
						else db.perms[id] = new List( args )
						
						msg.send( `Setted next permissions for user \`${client.users.cache.get( id ).tag}\`: \`${args.join( '`, `' )}\`` )
					} else msg.send( 'User not found' )
				} else
					msg.send( 'You did not provide permissions' )
			},
		})
		
		cmd.addSubcommand({
			aliases: 'remove',
			description: {
				single: 'removes permissions from users',
				usages: [
					['<@@>', '<permissions...>', 'removes $2 permissions from $1']
				]
			},
			callback: async ( msg, args ) => {
				let username = args.shift()

				if( args.length > 0 ){
					let id = await findMemberID( msg, username )

					if( id ){
						if( db.perms[id] ) db.perms[id].remove( args )
						else db.perms[id] = new List( args )
						
						msg.send( `Removed next permissions for user \`${client.users.cache.get( id ).tag}\`: \`${args.join( '`, `' )}\`` )
					} else msg.send( 'User not found' )
				} else
					msg.send( 'You did not provide permissions' )
			},
		})
	}
}