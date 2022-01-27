const db = require('better-sqlite3')('settings.db');
const config = require("./config.json");
const defaultID = config.default.guild_id; //"Default           ";
let guildCache = {}; //Might be better uncached?

//Drop Tables for testing purposes 
db.prepare(`
    DROP TABLE IF EXISTS guilds
`).run()
db.prepare(`
    DROP TABLE IF EXISTS banned_colors
`).run()

//Make sure guilds exists
db.prepare(`
    CREATE TABLE IF NOT EXISTS guilds (
        guild_id CHARACTER(18) NOT NULL,
        minrole CHARACTER(18),
        maxroles INT,
        color_pertime TINYINT,
        color_time INT,
        can_admin_settings BOOLEAN,
        PRIMARY KEY (guild_id)
    ) WITHOUT ROWID
`).run();
//Make sure banned_colors exists
db.prepare(`
    CREATE TABLE IF NOT EXISTS banned_colors (
        guild_id CHAR(18) NOT NULL,
        id INT UNIQUE NOT NULL,
        l_value REAL NOT NULL,
        a_value REAL NOT NULL,
        b_value REAL NOT NULL,
        threshold REAL,
        FOREIGN KEY (guild_id) REFERENCES guilds(guild_id),
        PRIMARY KEY (guild_id, id)
    )
`).run();


const addGuild = db.prepare(`
    INSERT INTO guilds
    VALUES (
        $guild_id,
        $minrole,
        $maxroles,
        $color_pertime,
        $color_time,
        $can_admin_settings
    )
`)
const getGuild = db.prepare(`
    SELECT
        *
    FROM
        guilds
    WHERE
        guild_id = $guild_id
`)
//Make sure the default guild exists
let defGuild = getGuild.get({guild_id: defaultID});
if (defGuild === undefined) addGuild.run(config.default);
//Make sure it matches the config file
else {
    let matches = true;
    const def = Object.entries(config.default);
    for (const value in config.default) {
        if (defGuild[value[0]] != value[1]) {
            matches = false;
            break;
        }
    }
    if (!matches) {
        db.prepare(`
            UPDATE
                guilds
            SET
                minrole = $minrole,
                maxroles = $maxroles,
                color_pertime = $color_pertime,
                color_ time = $color_time,
                can_admin_settings = $can_admin_settings
            WHERE
                    guild_id = $guild_id
        `).run(config.default);
    }
}

function newGuild(guild) {
    let defaultGuild = getGuild.get({ guild_id: defaultID })
    if (guild.minrole === undefined) {guild.minrole = defaultGuild.minrole}
    if (guild.maxroles === undefined) {guild.maxroles = defaultGuild.maxroles}
    if (guild.color_pertime === undefined) {guild.color_pertime = defaultGuild.color_pertime}
    if (guild.color_time === undefined) {guild.color_time = defaultGuild.color_time}
    if (guild.can_admin_settings === undefined) {guild.can_admin_settings = defaultGuild.can_admin_settings}
    addGuild.run(guild);
}

function checkCache(guild_id) {
    let now = Date.now();
    let guild = guildCache[guild_id]
    //Renews cache if over 30 minutes old
    if (guild === undefined || now - guild.birth >= 30 * 60 * 1000) {
        guild = getGuild.get({guild_id: guild_id});
        //Make a new entry if it's not in the db
        if (guild === undefined) {
            newGuild({guild_id: guild_id});
            guild = getGuild.get({guild_id: guild_id});
        }
        guild.birth = now;
        guildCache[guild_id] = guild
    }
    return guild;
}

exports.getMinRole = (guild_id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id === undefined) guild_id = guild_id.id;
    let guild = checkCache(guild_id);

    return guild.minrole;
}
exports.getMaxRoles = (guild_id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id === undefined) guild_id = guild_id.id;
    let guild = checkCache(guild_id);

    return guild.maxroles;
}
exports.getColorPerTime = (guild_id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id === undefined) guild_id = guild_id.id;
    let guild = checkCache(guild_id);

    return guild.color_pertime;
}
exports.getColorPerTime = (guild_id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id === undefined) guild_id = guild_id.id;
    let guild = checkCache(guild_id);

    return guild.color_time;
}
exports.getColorPerTime = (guild_id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id === undefined) guild_id = guild_id.id;
    let guild = checkCache(guild_id);

    return guild.can_admin_settings;
}



// Basic guilds for debug
newGuild({ guild_id: "770338797543096381" });
newGuild({ guild_id: "934115296355160124" });

// let err = new Error();
// delete err.stack;
// throw err;
//Tables structure
/*

CREATE TABLE IF NOT EXISTS guilds (
    guild_id CHARACTER(18) NOT NULL,
    minrole CHARACTER(18),
    maxroles INT,
    color_pertime TINYINT,
    color_time INT,
    can_admin_settings BOOLEAN,
    PRIMARY KEY (guild_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS banned_colors (
    guild_id CHAR(18) NOT NULL,
    id INT UNIQUE NOT NULL,
    l_value REAL NOT NULL,
    a_value REAL NOT NULL,
    b_value REAL NOT NULL,
    threshold REAL,
    FOREIGN KEY (guild_id) REFERENCES guild(guild_id),
    PRIMARY KEY (guild_id, id)
) WITHOUT ROWID

*/

// Guild:
// Role level required for use of bot. (given a specific role, anything in the list that's it or above)
// Permissions required for use of bot.
//     Whether it's and && or || check between the two
// Max number of color roles? If it has run into the limit, then it'll check if it can clean the colors, or pick the nearest color
// Blacklisted colors and how much range they affect. If I'm doing nearest color, I'll already have a method for color distance
// Can admin change settings?
// Global:
// How much to rate limit things
//     /color will probably be a rolling limit of something like 20 every half hour on a per user basis
// How dynamic the rate limits are (for cleancolors, it'll be based on the number of total roles it looked at last time it cleaned)
// Whether or not to actually listen to messages. (I'll put the code in, but probably won't bother)

// I'm sure there's more I can eventually think of