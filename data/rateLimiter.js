const db = require('better-sqlite3')('./data/rateLimit.db');
const SqliteError = require('better-sqlite3/lib/sqlite-error');
const nodeCron = require('node-cron');
// const settings = require('./settings.js'); //Might need?

// db.pragma('wal_autocheckpoint = 500'); //More write heavy so keep default 1000?
db.pragma('mmap_size = 30000000000'); //Use memory mapping instead of r/w calls
db.pragma('journal_mode = WAL'); //Increases performance, apparently
nodeCron.schedule('0 0 */12 * * *', () => {
    //Force a checkpoint and then optimize every 12 hours
    db.pragma('wal_checkpoint(truncate)');
    db.pragma('optimize');
});

// //Keep the db's pretty up to date for debugging
// nodeCron.schedule('*/2 * * * *', () => db.pragma('wal_checkpoint(full)'));

//Drop tables because they're now out of date
// db.prepare(`DROP TABLE IF EXISTS buckets`).run();
// db.prepare(`DROP TABLE IF EXISTS limits`).run();

//Make the limits table TODO: make virtual?
db.prepare(`
    CREATE TABLE IF NOT EXISTS limits (
        limit_id TINYINT NOT NULL,
        limit_type VARCHAR(6) NOT NULL UNIQUE,
        max_uses SMALLINT,
        use_per_hour SMALLINT,
        use_interval REAL,
        PRIMARY KEY (limit_id)
    ) WITHOUT ROWID
`).run();
//Make sure the limits exist
let limits = db.prepare(`SELECT * FROM limits`).raw().all();
if (limits[0] == undefined)
    db.prepare(`
        INSERT INTO limits
            (limit_id, limit_type, max_uses, use_per_hour, use_interval)
        VALUES
            (1, $color, $color_max, $color_per_hour, 60.0 / $color_per_hour),
            (2, $clean, $clean_max, $clean_per_hour, 60.0 / $clean_per_hour),
            (3, $config, $config_max, $config_per_hour, 60.0 / $config_per_hour)
    `).run(require("../config.json").ratelimits);
//Make sure it matches the config
else {
    let newColor = false, newClean = false, newConfig = false;
    const { ratelimits } = require("../config.json"); 
    //Compare values
    let limit = limits[0]
    if (limit[1] != ratelimits.color ||
        limit[2] != ratelimits.color_max ||
        limit[3] != ratelimits.color_per_hour)
        newColor = true;
    limit = limits[1]
    if (limit[1] != ratelimits.clean ||
        limit[2] != ratelimits.clean_max ||
        limit[3] != ratelimits.clean_per_hour)
        newClean = true;
    limit = limits[2]
    if (limit[1] != ratelimits.config ||
        limit[2] != ratelimits.config_max ||
        limit[3] != ratelimits.config_per_hour)
        newConfig = true;
    if (newColor || newClean || newConfig) {
        //Remove triggers (if exists)
        db.prepare(`DROP TRIGGER IF EXISTS readonly_limits`).run();
        //Fix values
        if (newColor) db.prepare(`
            UPDATE limits
            SET
                limit_type = $color,
                max_uses = $color_max,
                use_per_hour = $color_per_hour,
                use_interval = 60.0 / $color_per_hour
            WHERE
                limit_id = 1
        `).run(ratelimits);
        if (newClean) db.prepare(`
            UPDATE limits
            SET
                limit_type = $clean,
                max_uses = $clean_max,
                use_per_hour = $clean_per_hour,
                use_interval = 60.0 / $clean_per_hour
            WHERE
                limit_id = 2
        `).run(ratelimits);
        if (newConfig) db.prepare(`
            UPDATE limits
            SET
                limit_type = $config,
                max_uses = $config_max,
                use_per_hour = $config_per_hour,
                use_interval = 60.0 / $config_per_hour
            WHERE
                limit_id = 3
        `).run(ratelimits);
    }
}

//Make limits read-only
db.prepare(`
    CREATE TRIGGER IF NOT EXISTS readonly_limits
    BEFORE UPDATE ON limits
    BEGIN
        SELECT raise(abort, 'The config should be updated and bot restarted instead');
    END
`).run();

//Make the buckets table
db.prepare(`
    CREATE TABLE IF NOT EXISTS buckets(
        user_id CHAR(18) NOT NULL,
        limit_id TINYINT NOT NULL,
        uses_left SMALLINT,
        last_token DATETIME,
        FOREIGN KEY (limit_id) REFERENCES limits(limit_id)
        PRIMARY KEY (user_id, limit_id)
        CHECK(uses_left >= 0)
    ) WITHOUT ROWID
`).run();
//Constrain buckets.uses_left to below limits.max_uses
db.prepare(`
    CREATE TRIGGER IF NOT EXISTS constrain_bucket
    AFTER UPDATE ON buckets
    WHEN
        NEW.uses_left > OLD.uses_left
    BEGIN
        UPDATE
            buckets
        SET
            uses_left = (
                SELECT
                    max_uses
                FROM
                    limits
                WHERE
                    limit_id = NEW.limit_id
            ),
            last_token = DATETIME('now')
        WHERE
            user_id = NEW.user_id
            AND limit_id = NEW.limit_id
            AND NEW.uses_left > (
                SELECT
                    max_uses
                FROM
                    limits
                WHERE
                    limit_id = NEW.limit_id
            );
    END;
`).run();
//Autofill the bucket information
db.prepare(`
    CREATE TRIGGER IF NOT EXISTS new_bucket
    AFTER INSERT ON buckets
    BEGIN
        UPDATE
            buckets
        SET
            uses_left = (
                SELECT
                    max_uses
                FROM
                    limits lim
                WHERE
                    lim.limit_id = NEW.limit_id
            ),
            last_token = DATETIME('now')
        WHERE
            user_id = NEW.user_id
            AND limit_id = NEW.limit_id;
    END;
`).run();
//Make db use concurrent


const getLimitID = db.prepare(`
    SELECT
        limit_id
    FROM
        limits
    WHERE
        limit_type = $limit_type
`)

const newBucket = db.prepare(`
    INSERT INTO buckets (
        user_id,
        limit_id
    )
    VALUES (
        $user_id,
        $limit_id
    )
`)
const checkBucket = db.prepare(`
    SELECT
        *
    FROM
        buckets
    WHERE
        user_id = $user_id
        AND limit_id = $limit_id
`).pluck(true)
const updateBucket = db.prepare(`
    WITH calc AS
        (SELECT
            FLOOR((JULIANDAY('now') - JULIANDAY(buc.last_token)) * 24 * lim.use_per_hour) AS new_tokens,
            DATETIME(buc.last_token, (FLOOR((JULIANDAY('now') - JULIANDAY(buc.last_token))
                * 24 * lim.use_per_hour) * lim.use_interval) || ' minutes') AS new_token_time
        FROM
            buckets buc
        JOIN
            limits lim
        ON
            lim.limit_id = buc.limit_id
        WHERE
            buc.user_id = $user_id
            AND buc.limit_id = $limit_id)
    UPDATE
        buckets
    SET
        uses_left = uses_left + (
            SELECT
                new_tokens
            FROM
                calc
            ),
        last_token = (
            SELECT
                new_token_time
            FROM
                calc
            )
    WHERE
        user_id = $user_id
        AND limit_id = $limit_id
        AND 0 < (
            SELECT
                new_tokens
            FROM
                calc
            )
`)
const useBucket = db.prepare(`
    UPDATE buckets
    SET
        uses_left = uses_left - 1
    WHERE
        user_id = $user_id
        AND limit_id = $limit_id
`)
const tillNext = db.prepare(`
    SELECT
        strftime('%s',buc.last_token, lim.use_interval || ' minutes') AS next_token_seconds
    FROM
        buckets buc
    JOIN
        limits lim
    ON
        lim.limit_id = buc.limit_id
    WHERE
        buc.user_id = $user_id
        AND buc.limit_id = $limit_id
`)
function checkLimit(user_id, limit_id) {
    let idObj = {user_id: user_id, limit_id: limit_id}
    updateBucket.run(idObj);
    if (!checkBucket.get(idObj)) newBucket.run(idObj);
}
exports.useLimit = (user_id, limit_id) => {
    //Allow you to pass a GuildManager, MemberManager, or UserManager object
    if (user_id.id !== undefined) user_id = user_id.id;
    if (typeof limit_id != 'number') {
        let tempType = limit_id
        limit_id = getLimitID.get({limit_type: limit_id});
        if (limit_id == undefined) throw new Error(`No limit_id found for '${tempType}'`, 1);
        limit_id = limit_id.limit_id;
    }
    checkLimit(user_id, limit_id);
    try {
        useBucket.run({user_id: user_id, limit_id: limit_id});
    } catch (error) {
        if (error instanceof SqliteError) return tillNext.get({user_id: user_id, limit_id: limit_id}).next_token_seconds;
        throw error;
    }
    return false;
}
exports.useColor = (user_id) => {
    return useLimit(user_id, 1);
}
exports.useClean = (user_id) => {
    return useLimit(user_id, 2);
}
exports.useConfig = (user_id) => {
    return useLimit(user_id, 3);
}
exports.close = () => {
    db.close();
    return delete exports;
}

//Table Setup
/*

CREATE TABLE IF NOT EXISTS limits (
    limit_id TINYINT NOT NULL,
    limit_type VARCHAR(6) NOT NULL UNIQUE,
    max_uses SMALLINT,
    use_per_hour SMALLINT,
    use_interval REAL,
    PRIMARY KEY (limit_id)
) WITHOUT ROWID

INSERT INTO limits
VALUES
    (1, "color", $color_max, $color_per_hour),
    (2, "clean", $clean_max, $clean_per_hour),
    (3, "config", $config_max, $config_per_hour)


CREATE TABLE IF NOT EXISTS buckets (
    user_id CHAR(18) NOT NULL,
    limit_id TINYINT NOT NULL,
    uses_left SMALLINT,
    last_token DATETIME,
    FOREIGN KEY (limit_id) REFERENCES limits(limit_id)
    PRIMARY KEY (user_id, limit_id)
) WITHOUT ROWID



*/