const db = require('better-sqlite3')('./data/colorRoles.db');
const nodeCron = require('node-cron');
const { debug } = require('../logger');
const config = require("../config.json");
const colorSpace = require('../colorSpace.js');

db.pragma('wal_autocheckpoint = 500'); //Since it's read-heavy, smaller allowed wal size
db.pragma('mmap_size = 30000000000'); //Use memory mapping instead of r/w calls
db.pragma('journal_mode = WAL'); //Increases performance, apparently
let bidaily = nodeCron.schedule('0 0 */12 * * *', () => {
    //Force a checkpoint and then optimize every 12 hours
    db.pragma('wal_checkpoint(truncate)');
    db.pragma('optimize');
});


//Drop Table for testing purposes 
db.prepare(`DROP TABLE IF EXISTS color_roles`).run();

//Make sure guilds exists
db.prepare(`
    CREATE TABLE IF NOT EXISTS color_roles (
        role_id CHARACTER(18) NOT NULL,
        guild_id CHARACTER(18) NOT NULL,
        hex_value CHAR(7) NOT NULL,
        l_value REAL NOT NULL,
        a_value REAL NOT NULL,
        b_value REAL NOT NULL,
        PRIMARY KEY (role_id, guild_id)
    ) WITHOUT ROWID
`).run();

const addRole = db.prepare(`
	INSERT INTO color_roles (
		role_id,
		guild_id,
		hex_value,
		l_value,
		a_value,
		b_value
	)
	VALUES (
		$role_id,
		$guild_id,
		$hex_value,
		$l_value,
		$a_value,
		$b_value
	);
`)
const delRole = db.prepare(`
	DELETE FROM color_roles
	WHERE
		guild_id = $guild_id
		AND role_id = $role_id
`)
const getRole = db.prepare(`
	SELECT
		*
	FROM
		color_roles
	WHERE
		guild_id = $guild_id
		AND role_id = $role_id;
`)
const getRoles = db.prepare(`
	SELECT
		*
	FROM
		color_roles
	WHERE
		guild_id = $guild_id;
`).raw(true);

const getHex = db.prepare(`
SELECT
	*
FROM
	color_roles
WHERE
	guild_id = $guild_id
	AND hex_value = $hex_value
`);

let hexRegex = /^#[\da-f]{6}$/i;
exports.setup = async (client) => {
    let guilds = await client.guilds.fetch();
	guilds.forEach(async (g, gid) => {
		g = await g.fetch();
		let roles = await g.roles.fetch(null, {force: true});
		let me = await g.me.fetch(true);
		roles.forEach((r, rid) => {
			if (me.roles.highest.comparePositionTo(r) > 0 && r.name.match(hexRegex)) {
				let dbPK = {guild_id: gid, role_id: rid};
				let dbRole = getRole.get(dbPK)
				if (dbRole != undefined && dbRole.hex_value !== r.name) {
					delRole.run(dbPK)
					dbRole = undefined;
				}
				if (dbRole === undefined) {
					let lab = colorSpace.hex2lab(r.name);
					addRole.run({
						role_id: rid,
						guild_id: gid,
						hex_value: r.name,
						l_value: lab[0],
						a_value: lab[1],
						b_value: lab[2]
					});
				}
			}
		})
	}, (e) => {console.error(e)});
}

function addRoleDB(guild_id, role) {
	let lab = colorSpace.hex2lab(role.name);
	addRole.run({
		role_id: role.id,
		guild_id: guild_id,
		hex_value: role.name,
		l_value: lab[0],
		a_value: lab[1],
		b_value: lab[2]
	})
}

async function makeRole(guild, hex, reason) {
	let newRole = await guild.roles.create({
		name: hex,
		color: hex,
		mentionable: false,
		hoist: false,
		position: guild.roles.botRoleFor(guild.client.user).position,
		permissions: [],
		reason: reason
	});
	// For testing without *actual* roles
	// let newRole = {
	// 	id: parseInt(hex.slice(1), 16).toString().padStart(18, "0"),
	//  name: hex
	// }
	addRoleDB(guild.id, newRole);
	return newRole;
}

exports.requestNewRole = async (guild, hex, reason = "New color role requested") => {
	let role = getHex.get({guild_id: guild.id, hex_value: hex});
	if (role !== undefined) {
		role = guild.roles.resolve(role.role_id);
		if (role !== undefined) return role;
	}

	role = guild.roles.cache.find(role => role.name === hex);
	if (role !== undefined) {
		addRoleDB(guild.id, role);
		return role;
	}

	return await makeRole(guild, hex, reason);
}

exports.close = () => {
    bidaily.stop();

    db.pragma('vacuum');
    db.pragma('optimize');
    db.close();
    return delete exports;
}

//Testing stuff
// let labA = [
// 	53.23288178584245,
// 	80.10930952982204,
// 	67.22006831026425
// ]
// let labB = [
// 	53.85596218087315,
// 	81.80288058559398,
// 	31.565158730632948
// ]
// let testValues = `
// (SELECT
// 	${labA[0]} as l_value,
// 	${labA[1]} as a_value,
// 	${labA[2]} as b_value) as new,
// (SELECT
// 	${labB[0]} as l_value,
// 	${labB[1]} as a_value,
// 	${labB[2]} as b_value) as old
// `
// console.log(db.prepare(`
// SELECT
// 	CASE
// 		WHEN calc.deltaesq < 0 THEN 0
// 		ELSE SQRT(calc.deltaesq)
// 	END AS deltae
// FROM
// 	(SELECT
// 		POWER(calc.deltalklsl, 2) + POWER(calc.deltackcsc, 2) + POWER(calc.deltahkhsh, 2) as deltaesq
// 	FROM
// 		(SELECT
// 			calc.deltal as deltalklsl,
// 			calc.deltac / calc.sc as deltackcsc,
// 			CASE
// 				WHEN calc.deltah < 0 THEN 0
// 				ELSE SQRT(calc.deltah) / calc.sh
// 			END AS deltahkhsh
// 		FROM
// 			(SELECT
// 				POWER(calc.deltaa, 2) + POWER(calc.deltab, 2) - POWER(calc.c1 - calc.c2, 2) AS deltah,
// 				deltal,
// 				calc.c1 - calc.c2 AS deltac,
// 				1.0 + (0.045 * calc.c1) AS sc,
// 				1.0 + (0.015 * calc.c1) AS sh
// 			FROM
// 				(SELECT
// 					new.l_value - old.l_value AS deltal,
// 					new.a_value - old.a_value AS deltaa,
// 					new.b_value - old.b_value AS deltab,
// 					SQRT(POWER(new.a_value, 2) + POWER(new.b_value, 2)) AS c1,
// 					SQRT(POWER(old.a_value, 2) + POWER(old.b_value, 2)) AS c2
// 				FROM
// 					${testValues}) AS calc) AS calc) AS calc) as calc;
// `).get());

// console.log(getRole.get({guild_id: "123456789123456789", role_id: "123456789123456789"}));


const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
require('dotenv').config()
const { Client, Intents, Collection } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES] });
client.once('ready', async () => {
	await exports.setup(client);
	await sleep(1000);
	client.destroy();

	exports.close();
});
client.login(process.env.TOKEN);