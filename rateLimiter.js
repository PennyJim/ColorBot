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
            use_interval = NEW.use_per_hour / 60.0;
    END;
`).run();
//Make sure it matches the config
db.prepare(`
    INSERT INTO limits
        (limit_id, limit_type, max_uses, use_per_hour, use_interval)
    VALUES
        (1, $color, $color_max, $color_per_hour, $color_per_hour / 60.0),
        (2, $clean, $clean_max, $clean_per_hour, $clean_per_hour / 60.0),
        (3, $config, $config_max, $config_per_hour, $config_per_hour / 60.0)
`).run(config.ratelimits);

//Make the buckets table
db.prepare(`
    CREATE TABLE buckets (
        user_id CHAR(18) NOT NULL,
        limit_id TINYINT NOT NULL,
        uses_left SMALLINT,
        last_updated DATETIME,
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
            )
        WHERE NEW.uses_left > (
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
            last_updated = datetime('now')
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
        limit_id,
        uses_left,
        last_updated
    )
    VALUES (
        $user_id,
        $limit_id,
        null,
        null
    )
`)
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
    last_updated DATETIME,
    FOREIGN KEY (limit_id) REFERENCES limits(limit_id)
    PRIMARY KEY (user_id, limit_id)
) WITHOUT ROWID



*/