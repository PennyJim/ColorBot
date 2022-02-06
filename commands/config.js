const { SlashCommandBuilder } = require('@discordjs/builders');
const settings = require('../settings.js');
const logger = require("../logger.js");

exports.msgrun = async (client, message, args) => {
    message.reply({content: "My ping is \`" + client.ws.ping + " ms\`", ephemeral: true});
}

exports.slashrun = async (client, interaction) => {
    if (!interaction.inGuild())
        return interaction.reply({content: "This only works in guilds", ephemeral: true});
    if (interaction.member.id !== interaction.guild.ownerId &&
        !(settings.getCanAdminConfig(interaction.guild.id) && interaction.memberPermissions.has("ADMINISTRATOR")))
        return interaction.reply({content: "You do not have permission to do this", ephemeral: true});

    logger.debug(interaction.guild, interaction.member, "Subcommand:", interaction.options.getSubcommand(false))
    logger.debug(interaction.guild, interaction.member, "Options:", interaction.options)

    switch (interaction.options.getSubcommand(false)) {
        case 'set':
            let newValue, updated = [];
            if (newValue = interaction.options.get("minrole")) {
                newValue = newValue.value;
                // if (newValue == interaction.guildId) newValue = null;
                logger.debug(interaction.guild, interaction.member, "new minrole:", newValue);
                settings.setMinRole(interaction.guildId, newValue);
                updated.push("minrole");
            }
            if (newValue = interaction.options.get("maxroles")) {
                newValue = newValue.value;
                logger.debug(interaction.guild, interaction.member, "new maxroles:", newValue);
                settings.setMaxRoles(interaction.guildId, newValue);
                updated.push("maxroles");
            }
            if (newValue = interaction.options.get("adminconfig")) {
                newValue = newValue.value;
                logger.debug(interaction.guild, interaction.member, "new adminconfig:", newValue);
                settings.setCanAdminConfig(interaction.guildId, newValue);
                updated.push("adminconfig");
            }

            //Respond with what has been updated
            if (updated.length > 1) {
                let last = updated.pop();
                logger.log(interaction.guild, interaction.member, `Updated ${updated.join(', ')}${updated.length > 1 ? "," : ""} and`, last);
                return interaction.reply({content: `Updated \`${updated.join('`, `')}\`${updated.length > 1 ? "," : ""} and \`${last}\`.`, ephemeral: true});
            } else if (updated.length == 1) {
                logger.log(interaction.guild, interaction.member, "Updated", updated[0]);
                return interaction.reply({content: `Updated \`${updated[0]}\`.`, ephemeral: true});
            } else {
                logger.log(interaction.guild, interaction.member, "Updated nothing");
                return interaction.reply({content: `Updated nothing.`, ephemeral: true});
            }
            break;
        case 'get':
            break;
        default:
            logger.err(interaction.guild, interaction.member, `Subcommand "${options.getSubcommand(false)}" is not implemented.`);
            return interaction.reply({content: `Subcommand "${options.getSubcommand(false)}" is not implemented.`, ephemeral: true});
    }

    interaction.reply({content: "My ping is \`" + client.ws.ping + " ms\`", ephemeral: true});
}

exports.help = {
    name:"config",
    limit: "config",
    limitScope: "guild"
}

exports.generateCommand = (isTest = false) => {
    if (!isTest) {
        return [

        ]
    } else {
        return [
            new SlashCommandBuilder()
                .setName(exports.help.name)
                .setDescription('Replies with pong!')
                .addSubcommand(subcommand => subcommand
                    .setName("get")
                    .setDescription("Retrieves the setting")
                    .addStringOption(option => option
                        .setName("setting")
                        .setDescription("What setting is retrieved. Gets all if left blank")
                        .addChoice("MinRole", "MinRole")
                        .addChoice("MaxRoles", "MaxRoles")
                        .addChoice("AdminConfig", "AdminConfig"))
                )
                .addSubcommand(subcommand => subcommand
                    .setName("set")
                    .setDescription("Updates the setting")
                    .addRoleOption(option => option
                        .setName("minrole")
                        .setDescription("The lowest listed role that can use /color")
                    )
                    .addIntegerOption(option => option
                        .setName("maxroles")
                        .setDescription("The ammount of roles ColorBot can create")
                    )
                    .addBooleanOption(option => option
                        .setName("adminconfig")
                        .setDescription("Can administrators change the config?")
                    )
                )
                .toJSON()
        ]
    }
}