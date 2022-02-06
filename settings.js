const db = require('better-sqlite3')('./data/settings.db');
const config = require("./config.json");
const defaultID = config.default.guild_id; //"Default           ";
let guildCache = {}; //Might be better uncached?

//Drop Tables for testing purposes 
// db.prepare(`DROP TABLE IF EXISTS banned_colors  `).run()
// db.prepare(`DROP TABLE IF EXISTS guilds         `).run()

//Make sure guilds exists
db.prepare(`
    CREATE TABLE IF NOT EXISTS guilds (
        guild_id CHARACTER(18) NOT NULL,
        minrole CHARACTER(18),
        maxroles INT,
        can_admin_config BOOLEAN,
        PRIMARY KEY (guild_id)
    ) WITHOUT ROWID
`).run();
//Make sure banned_colors exists
db.prepare(`
    CREATE TABLE IF NOT EXISTS banned_colors (
        l_value REAL NOT NULL,
        a_value REAL NOT NULL,
        b_value REAL NOT NULL,
        threshold REAL NOT NULL,
        guild_id CHAR(18) NOT NULL,
        FOREIGN KEY (guild_id) REFERENCES guilds(guild_id),
        PRIMARY KEY (guild_id, l_value, a_value, b_value)
    )
`).run();
//Make db use concurrent
db.pragma('journal_mode = WAL');

//Statement for adding or getting guilds
const addGuild = db.prepare(`
    INSERT INTO guilds
    VALUES (
        $guild_id,
        $minrole,
        $maxroles,
        $can_admin_config
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
                can_admin_config = $can_admin_config
            WHERE
                guild_id = $guild_id
        `).run(config.default);
    }
}

//Function for making a new guild entry in the database
function newGuild(guild) {
    let defaultGuild = getGuild.get({ guild_id: defaultID })
    if (guild.minrole === undefined) {guild.minrole = guild.guild_id}
    if (guild.maxroles === undefined) {guild.maxroles = defaultGuild.maxroles}
    if (guild.can_admin_config === undefined) {guild.can_admin_config = defaultGuild.can_admin_config}
    addGuild.run(guild);
}

//Function to grab the guild entry either from cache or database
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

//Getters
exports.getMinRole = (guild_id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id !== undefined) guild_id = guild_id.id;
    let guild = checkCache(guild_id);

    return guild.minrole;
}
exports.getMaxRoles = (guild_id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id !== undefined) guild_id = guild_id.id;
    let guild = checkCache(guild_id);

    return guild.maxroles;
}
exports.getCanAdminConfig = (guild_id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id !== undefined) guild_id = guild_id.id;
    let guild = checkCache(guild_id);

    return guild.can_admin_config === 1;
}

//Generic set statements
function setDefaultValue(newValue, sqlStatement) {
    return sqlStatement.run({
        guild_id: defaultID,
        new_value: newValue
    });
}
function setValue(guild_id, newValue, sqlStatement) {
    //Allow you to pass a GuildManager object
    if (guild_id.id !== undefined) guild_id = guild_id.id;
    //Don't cache the Default guild
    if (guild_id == defaultID) return this.setDefaultValue(newValue, sqlStatement);

    let guild = checkCache(guild_id);
    guild.minrole = newValue;
    return sqlStatement.run({
        guild_id: guild_id,
        new_value: newValue
    });
}

//Specific use cases of the generic set statements
const setMinRole = db.prepare(`
    UPDATE
        guilds
    SET
        minrole = $new_value
    WHERE
        guild_id = $guild_id
`)
exports.setDefaultMinRole = (newValue) => {
    return setDefaultValue(newValue, setMinRole);
}
exports.setMinRole = (guild_id, newValue) => {
    return setValue(guild_id, newValue, setMinRole);
}

const setMaxRoles = db.prepare(`
    UPDATE
        guilds
    SET
        maxroles = $new_value
    WHERE
        guild_id = $guild_id
`)
exports.setDefaultMaxRoles = (newValue) => {
    return setDefaultValue(newValue, setMaxRoles);
}
exports.setMaxRoles = (guild_id, newValue) => {
    return setValue(guild_id, newValue, setMaxRoles);
}

const setCanAdminConfig = db.prepare(`
    UPDATE
        guilds
    SET
        can_admin_config = $new_value
    WHERE
        guild_id = $guild_id
`)
exports.setDefaultCanAdminConfig = (newValue) => {
    //So it can recieve booleans without it dying
    if (newValue) {newValue = 1} else { newValue = 0}
    return setDefaultValue(newValue, setCanAdminConfig);
}
exports.setCanAdminConfig = (guild_id, newValue) => {
    //So it can recieve booleans without it dying
    if (newValue) {newValue = 1} else { newValue = 0}
    return setValue(guild_id, newValue, setCanAdminConfig);
}

//SQL statments for banned colors
const addBannedColor = db.prepare(`
    INSERT INTO banned_colors (
        l_value,
        a_value,
        b_value,
        threshold,
        guild_id
    )
    VALUES (
        $l_value,
        $a_value,
        $b_value,
        $threshold,
        $guild_id
    )
`)
const getBannedColors = db.prepare(`
    SELECT
        l_value,
        a_value,
        b_value,
        threshold,
        rowid
    FROM
        banned_colors
    WHERE
        guild_id = $guild_id
    ORDER BY
        rowid ASC
`).raw(true);
const setBannedThreshold = db.prepare(`
    UPDATE
        banned_colors
    SET
        threshold = $new_value
    WHERE
        rowid = $id
        AND guild_id = $guild_id
`)
const removeBannedColor = db.prepare(`
    DELETE FROM banned_colors
    WHERE
        rowid = $id
        AND guild_id = $guild_id
`)

exports.addBannedColor = (guild_id, lab, threshhold) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id !== undefined) guild_id = guild_id.id;
    checkCache(guild_id);

    return addBannedColor.run({
        guild_id: guild_id,
        l_value: lab[0],
        a_value: lab[1],
        b_value: lab[2],
        threshold: threshhold
    })
}
exports.getBannedColors = (guild_id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id !== undefined) guild_id = guild_id.id;

    return getBannedColors.all({guild_id: guild_id});
}
exports.setBannedThreshold = (guild_id, id, newValue) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id !== undefined) guild_id = guild_id.id;

    return setBannedThreshold.run({
        guild_id: guild_id,
        id: id,
        new_value: newValue
    })
}
exports.removeBannedColor = (guild_id, id) => {
    //Allow you to pass a GuildManager object
    if (guild_id.id !== undefined) guild_id = guild_id.id;

    return removeBannedColor.run({
        guild_id: guild_id,
        id: id
    })
}
exports.close = () => {
    db.close();
    return delete exports;
}
/*

CREATE TABLE IF NOT EXISTS guilds (
    guild_id CHAR(18) NOT NULL,
    minrole CHAR(18),
    maxroles INT,
    color_pertime TINYINT,
    color_time INT,
    can_admin_config BOOLEAN,
    PRIMARY KEY (guild_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS banned_colors (
    l_value REAL NOT NULL,
    a_value REAL NOT NULL,
    b_value REAL NOT NULL,
    threshold REAL NOT NULL,
    guild_id CHAR(18) NOT NULL,
    id INT UNIQUE NOT NULL,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id),
    PRIMARY KEY (guild_id, id)
)

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