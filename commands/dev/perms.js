// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const discord = require( 'discord.js' )
		const bakadb = require( '@/instances/bakadb' )
		const client = require( '@/instances/client' )
		const { db } = bakadb
		const List = require( '@/re/list' )

		bakadb.createCoder( List, perms => 'List:' + perms.toString(), list => new List( list ) )

		if( db.perms ){
			for( let k in db.perms ){
				let perms = db.perms[k]

				if( typeof perms != 'object' || perms.constructor != List )
					delete db.perms[k]
				else if( Object.keys( perms ).length === 0 )
					delete db.perms[k]
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

		const cmd = addCommand({
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
			async callback({ args, session }){
				let id = args.shift()

				if( !id )
					return session.update( this.help )

				const member = await client.users.find( id )

				if( !member )
					return session.update( 'User not found' )

				const list = db.perms[member.id]?.pretty()

				if( list )
					session.update( `\`${member.tag}\`'s permissions: ${list}` )
				else
					session.update( `User \`${member.tag}\` has no permissions` )
			},
		})

		cmd.addSubcommand({
			aliases: 'set',
			description: {
				single: 'sets permissions for users',
				usages: [
					['<@@>', '<permissions...>', 'sets $2 permissions for $1'],
				],
			},
			async callback({ args, session }){
				let id = args.shift()

				if( !id )
					return session.update( this.help )

				if( args.length === 0 )
					return session.update( `You didn't provide any permissions` )

				const member = await client.users.find( id )

				if( !member )
					return session.update( 'User not found' )

				args = new List( args )

				if( db.perms[member.id] )
					db.perms[member.id].add( args )
				else
					db.perms[member.id] = args

				bakadb.save()
				session.update( `Granted \`${member.tag}\` next permissions: ${args.pretty()}` )
			},
		})

		cmd.addSubcommand({
			aliases: 'remove',
			description: {
				single: 'removes permissions from users',
				usages: [
					['<@@>', '<permissions...>', 'removes $2 permissions from $1'],
				],
			},
			async callback({ args, session }){
				let id = args.shift()

				if( !id )
				return session.update( this.help )

				if( args.length === 0 )
					return session.update( `You didn't provide any permissions` )

				const member = await client.users.find( id )

				if( !member )
					return session.update( 'User not found' )

				args = new List( args )

				if( !db.perms[member.id] )
					return session.update( `\`${member.tag}\` has no permissions` )

				db.perms[member.id].remove( args )
				bakadb.save()
				session.update( `Revoked from \`${member.tag}\` next permissions: ${args.pretty()}` )
			},
		})
	}
}