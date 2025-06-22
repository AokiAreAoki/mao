// eslint-disable-next-line no-global-assign
require = global.alias(require)

const discord = require( 'discord.js' )
const bakadb = require( '@/instances/bakadb' )
const { db } = bakadb
const List = require( '@/re/list' )

const Permissions = {
	MASTER: 'master',
	EVAL_ALL: 'evalall',
	H264IFY: 'h264ify',
}
const PermissionsArray = Object.values( Permissions )
const PermissionsSet = new Set( PermissionsArray )
const PermissionsList = new List( PermissionsArray )

bakadb.createCoder( List, perms => 'List:' + perms.toString(), list => new List( list ) )

if( db.perms ){
	for( let k in db.perms ){
		let perms = db.perms[k]

		if( typeof perms != 'object' || perms.constructor != List )
			delete db.perms[k]
		else if( Object.keys( perms ).length === 0 )
			delete db.perms[k]
	}
} else {
	db.perms = {}
}

// addPerms
discord.User.prototype.addPerms = function( permissions ){
	if( !permissions )
		return false

	if( db.perms[this.id] ){
		db.perms[this.id].add( permissions )
	} else {
		db.perms[this.id] = new List( permissions )
	}

	return true
}

discord.GuildMember.prototype.addPerms = function( permissions ){
	this.user.addPerms( permissions )
}

// removePerms
discord.User.prototype.removePerms = function( permissions ){
	if( !permissions )
		return false

	if( db.perms[this.id] )
		db.perms[this.id].remove( permissions )

	return true
}

discord.GuildMember.prototype.removePerms = function( permissions ){
	this.user.removePerms( permissions )
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
	return !!db.perms[this.id]?.has( permission )
}

discord.GuildMember.prototype.hasPerm = function( permission ){
	return this.user.hasPerm( permission )
}

// isMaster
discord.User.prototype.isMaster = function(){
	return this.id == '247028662312894466' || this.hasPerm( Permissions.MASTER )
}

discord.GuildMember.prototype.isMaster = function(){
	return this.user.isMaster()
}

module.exports = {
	Permissions,
	PermissionsArray,
	PermissionsSet,
	PermissionsList,
}