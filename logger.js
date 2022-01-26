const chalk = require('chalk')
const { format, getUnixTime, fromUnixTime } = require('date-fns')

const error = chalk.red;//Will probably need to be changed
const errorQuiet = error.dim
const warn = chalk.hex('#D7D75F')
const warnQuiet = warn.dim; //chalk.hex('#9C9C27');
const standard = chalk.reset;
const quiet = standard.grey
const quieter = chalk.dim
const quietest = quieter.grey

function makePrefix (guild, user, standard, quiet) {
    let prefix = standard(format(fromUnixTime(Date.now() / 1000),"MMM dd HH:mm:ss"));
    if (guild !== undefined && guild !== null) {
        prefix += standard(` ${guild.name}`) + quiet(`#${guild.id}`)
    }
    if (user !== undefined && user !== null) {
        if (user.guild !== undefined) { user = user.user; }
        prefix += standard(` ${user.username}`) + quiet(`#${user.discriminator}`)
    }
    prefix += standard(":");
    return prefix;
}

exports.log = (guild, user, ...text) => {
    let prefix = makePrefix(guild, user, standard, quiet);
    console.log(prefix, ...text);
}

exports.debug = (guild, user, ...text) => {
    let prefix = makePrefix(guild, user, quieter, quietest);
    console.log(prefix, ...text);
}

exports.error = (guild, user, ...text) => {
    let prefix = makePrefix(guild, user, error, errorQuiet)
    console.log(prefix, ...text);
}
exports.err = exports.error;

exports.warn = (guild, user, ...text) => {
    let prefix = makePrefix(guild, user, warn, warnQuiet)
    console.log(prefix, ...text);
}