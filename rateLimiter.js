const db = require('better-sqlite3')('./data/rateLimit.db');
// const settings = require('./settings.js'); //Might need?
const config = require("./config.json");

//Drop tables because they're now out of date
db.prepare(`DROP TABLE IF EXISTS buckets`).run();
db.prepare(`DROP TABLE IF EXISTS limits`).run();


//Make the limits table TODO: make virtual?
db.prepare(`
    CREATE TABLE limits (
        limit_id TINYINT NOT NULL,
        limit_type VARCHAR(6) NOT NULL UNIQUE,
        max_uses SMALLINT,
        use_per_hour SMALLINT,
        use_interval REAL,
        PRIMARY KEY (limit_id)
    ) WITHOUT ROWID
`).run();
//For when/if buckets aren't cleared on start
db.prepare(`
    CREATE TRIGGER update_limit
    AFTER UPDATE ON limits
    WHEN
        OLD.max_uses > NEW.max_uses
    BEGIN
        UPDATE
            buckets
        SET
            uses_left = NEW.max_uses
        WHERE
            limit_id = NEW.limit_id
            AND uses_left > NEW.max_uses;
    END;
`).run();
//Auto Calculate the interval
db.prepare(`
    CREATE TRIGGER update_interval
    AFTER UPDATE ON limits
    WHEN
        OLD.use_per_hour <> NEW.use_per_hour
    BEGIN
        UPDATE
            limits
        SET
            use_interval = 60.0 / NEW.use_per_hour;
    END;
`).run();
//Make sure it matches the config
db.prepare(`
    INSERT INTO limits
        (limit_id, limit_type, max_uses, use_per_hour, use_interval)
    VALUES
        (1, $color, $color_max, $color_per_hour, 60.0 / $color_per_hour),
        (2, $clean, $clean_max, $clean_per_hour, 60.0 / $clean_per_hour),
        (3, $config, $config_max, $config_per_hour, 60.0 / $config_per_hour)
`).run(config.ratelimits);

//Make the buckets table
db.prepare(`
    CREATE TABLE buckets (
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
    CREATE TRIGGER update_bucket
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
    CREATE TRIGGER new_bucket
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
db.pragma('journal_mode = WAL');


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
function checkLimit(user_id, limit_id) {
    let idObj = {user_id: user_id, limit_id: limit_id}
    updateBucket.run(idObj);
    if (!checkBucket.get(idObj)) newBucket.run(idObj);
}
function useLimit(user_id, limit_id) {
    //Allow you to pass a GuildManager, MemberManager, or UserManager object
    if (user_id.id !== undefined) user_id = user_id.id;
    checkLimit(user_id, limit_id);
    try {
        useBucket.run({user_id: user_id, limit_id: limit_id});
    } catch (error) {
        return false;
    }
    return true;
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