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

exports.setup = (client) => {

}

exports.close = () => {
    bidaily.stop();

    db.pragma('vacuum');
    db.pragma('optimize');
    db.close();
    return delete exports;
}