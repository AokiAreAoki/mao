// eslint-disable-next-line no-global-assign
require = global.alias(require)
module.exports = {
	init({ addCommand }){
		const client = require( '@/instances/client' )
		const bakadb = require( '@/instances/bakadb' )
		const { db } = bakadb
		const { PermissionsArray, PermissionsSet, PermissionsList } = require( '@/constants/perms' )
		const List = require( '@/re/list' )

		const CHECK_EMOJI = `✅`
		const CROSS_EMOJI = `❌`

		const cmd = addCommand({
			aliases: 'perm perms',
			description: 'manages bot permissions',
		})

		cmd.addSubcommand({
			aliases: 'list',
			description: {
				single: 'lists all permissions',
				usages: [
					['lists all existing permissions'],
					['<@@>', 'lists all permissions $1 has'],
				]
			},
			async callback({ args, session }){
				let id = args.shift()

				if( !id )
					return session.update( `All existing permissions: ${ PermissionsArray
						.map( perm => `\`${perm}\`` )
						.join( ', ' )
					}` )

				const user = await client.users.find( id )

				if( !user )
					return session.update( 'User not found' )

				const list = PermissionsList.pretty( perm => `- \`${perm}\` - ${ user.hasPerm( perm )
					? CHECK_EMOJI
					: CROSS_EMOJI
				}`, '\n' )

				if( list )
					session.update( `\`${user.tag}\`'s permissions:\n${list}` )
				else
					session.update( `\`${user.tag}\` has no permissions` )
			},
		})

		cmd.addSubcommand({
			aliases: 'grant',
			description: {
				single: 'grants permissions for users',
				usages: [
					['<@@>', '<permissions...>', 'grants $2 permissions for $1'],
				],
			},
			async callback({ args, session }){
				let id = args.shift()

				if( !id )
					return session.update( this.help )

				if( args.length === 0 )
					return session.update( `You didn't provide any permissions` )

				const unknownPerms = args.filter( arg => !PermissionsSet.has( arg ) )

				if( unknownPerms.length !== 0 )
					return session.update( `Unknown permissions: ${unknownPerms
						.map( perm => `\`${perm}\`` )
						.join( ', ' )
					}` )

				const user = await client.users.find( id )

				if( !user )
					return session.update( 'User not found' )

				const permsList = new List( args )
				const summary = permsList.pretty( perm => `- \`${perm}\` - ${ user.hasPerm( perm )
					? 'already had ☑️'
					: 'granted ✅'
				}`, '\n' )

				user.addPerms( permsList )
				bakadb.save()

				session.update( `Granted permissions to \`${user.tag}\`. Summary:\n${summary}` )
			},
		})

		cmd.addSubcommand({
			aliases: 'revoke',
			description: {
				single: 'revokes permissions from users',
				usages: [
					['<@@>', '<permissions...>', 'revokes $2 permissions from $1'],
				],
			},
			async callback({ args, session }){
				let id = args.shift()

				if( !id )
				return session.update( this.help )

				if( args.length === 0 )
					return session.update( `You didn't provide any permissions` )

				const user = await client.users.find( id )

				if( !user )
					return session.update( 'User not found' )

				if( !db.perms[user.id] )
					return session.update( `\`${user.tag}\` has no permissions` )

				const permsList = new List( args )
				const summary = permsList.pretty( perm => `- \`${perm}\` - ${ user.hasPerm( perm )
					? 'revoked ❌'
					: 'did not had ✖️'
				}`, '\n' )

				user.removePerms( permsList )
				bakadb.save()

				session.update( `Revoked permissions from \`${user.tag}\`. Summary:\n${summary}` )
			},
		})
	}
}