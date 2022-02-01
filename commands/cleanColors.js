const { SlashCommandBuilder } = require('@discordjs/builders');
const logger = require("../logger.js");
const hexRegex = /^#[\da-f]{6}$/i
exports.run = async (client, guild) => {
    logger.log(guild, null, "Deleting old color roles");

    let oldRoles = 0;
    (await guild.roles.fetch(null, {force: true})).forEach(r => {
        if (r.name.match(hexRegex) && r.members.size == 0)
        {
            logger.debug(guild, null, "Name:", r.name/*, "Size:", r.members.size*/);
            r.delete("An unused color role");
            oldRoles++;
        }
    });

    logger.log(guild, null, `Deleted ${oldRoles} role(s)`);
    return oldRoles;
}

exports.msgrun = async (client, message, args) => {
    if (!message.inGuild()) { return message.reply({content: "This only works in guilds", ephemeral: true}); }
    //Check for permission inside the guild
    if (!message.member.permissions.has("MANAGE_ROLES")) { return interaction.reply({content: "You do not have permission to do this", ephemeral: true}); }

    let count = await this.run(client, message.guild)
    message.reply({content: `${count} colors have been cleaned up`, ephemeral: true});
}

exports.slashrun = async (client, interaction) => {
    if (!interaction.inGuild()) { return interaction.reply({content: "This only works in guilds", ephemeral: true}); }
    //Check how long it's been
    // let now = Date.now()
    // if (client.lastCleaned[interaction.guild.id] !== undefined &&
    //     now - client.lastCleaned[interaction.guild.id] < 10 * 60 * 1000) {
    //         return interaction.reply({content: "You can only do this once every 10 minutes", ephemeral: true});
    //     }
    // client.lastCleaned[interaction.guild.id] = now;
    //Check for permission inside the guild
    if (!interaction.member.permissions.has("MANAGE_ROLES")) { return interaction.reply({content: "You do not have permission to do this", ephemeral: true}); }

    let count = await this.run(client, interaction.guild)
    interaction.reply({content: `${count} colors have been cleaned up`, ephemeral: true});
}


exports.help = {
    name:"cleancolors",
    limit: "clean",
    limitScope: "guild"
}
exports.generateCommand = (isTest = false) => {
    if (!isTest) {
        return [
            new SlashCommandBuilder().setName(exports.help.name).setDescription('Removes any unused color role')
        ]
    } else {
        return [
            
        ]
    }
}
