module.exports = {
	requirements: 'discord bakadb db List maoclr findMem',
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

		function findMem2( guild, username ){
			let ping = /^<@!?(\d+)>$/i.exec( username )

			if( ping )
				return ping[1]
			else {
				let member = findMem( guild, username )
				if( member ) return member.id
			}

			return null
		}

		// Commands
		let actions = {
			get: ( msg, args ) => {
				let username = args.shift()
				
				if( username ){
					let id = findMem2( msg, username )

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
			set: ( msg, args ) => {
				let username = args.shift()

				if( args.length > 0 ){
					let id = findMem2( msg, username )

					if( id ){
						if( db.perms[id] ) db.perms[id].add( args )
						else db.perms[id] = new List( args )
						
						msg.send( `Setted next permissions for user \`${client.users.cache.get( id ).tag}\`: \`${args.join( '`, `' )}\`` )
					} else msg.send( 'User not found' )
				} else
					msg.send( 'You did not provide permissions' )
			},
			remove: ( msg, args ) => {
				let username = args.shift()

				if( args.length > 0 ){
					let id = findMem2( msg, username )

					if( id ){
						if( db.perms[id] ) db.perms[id].remove( args )
						else db.perms[id] = new List( args )
						
						msg.send( `Removed next permissions for user \`${client.users.cache.get( id ).tag}\`: \`${args.join( '`, `' )}\`` )
					} else msg.send( 'User not found' )
				} else
					msg.send( 'You did not provide permissions' )
			},
		}

		addCmd( 'perm perms', { short: 'manages bot permissions', full: '// TODO' }, ( msg, args ) => {
			let action = args.shift()

			if( action ){
				action = action.toLowerCase()
				if( actions[action] ) actions[action]( msg, args )
				else msg.send( 'Unknown action' )
			} else {
				let list = ''

				for( let k in actions ){
					if( list ) list += ', '
					list += `\`${k}\``
				}

				msg.send( embed().addField( 'Actions:', list ) )
			}
		})
	}
}