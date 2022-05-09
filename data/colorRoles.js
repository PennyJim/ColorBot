const db = require('better-sqlite3')('./data/settings.db');
const nodeCron = require('node-cron');
const { debug } = require('../logger');
const config = require("../config.json");

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

//TODO: fix
console.log(db.prepare(`
SELECT
	SQRT((SELECT
		POWER(calc.deltalklsl, 2) + POWER(calc.deltackcsc, 2) + POWER(calc.deltahkhsh, 2) as deltaesq
	FROM
		(SELECT
			calc.deltal as deltalklsl,
			calc.deltac / calc.sc as deltackcsc,
			CASE
				WHEN calc.deltah < 0 THEN 0
				ELSE calc.deltah / calc.sh
			END AS deltahkhsh
		FROM
			(SELECT
				POWER(calc.deltaa, 2) + POWER(calc.deltab, 2) + POWER(calc.c1 - calc.c2, 2) AS deltah,
				deltal,
				calc.c1 - calc.c2 AS deltac,
				1.0 + (1.045 * calc.c1) AS sc,
				1.0 + (1.015 * calc.c1) AS sh
			FROM
				(SELECT
					new.l_value - old.l_value AS deltal,
					new.a_value - old.a_value AS deltaa,
					new.b_value - old.b_value AS deltab,
					SQRT(POWER(new.a_value, 2) + POWER(new.b_value, 2)) AS c1,
					SQRT(POWER(old.a_value, 2) + POWER(old.b_value, 2)) AS c2) AS calc) AS calc) AS calc)) as deltae
FROM
	(SELECT
		53.23288178584245 as l_value,
		80.10930952982204 as a_value,
		67.22006831026425 as b_value) as old,
	(SELECT
		53.85596218087315 as l_value,
		81.80288058559398 as a_value,
		31.565158730632948 as b_value) as new;
`).get());
console.log(require('../colorSpace.js').labDeltaE([
        53.23288178584245,
        80.10930952982204,
        67.22006831026425
        ],[
        53.85596218087315,
        81.80288058559398,
        31.565158730632948
    ]));

exports.setup = (client) => {
    
}

exports.close = () => {
    bidaily.stop();

    db.pragma('vacuum');
    db.pragma('optimize');
    db.close();
    return delete exports;
}

exports.close();