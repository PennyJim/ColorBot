const { SlashCommandBuilder } = require('@discordjs/builders');
const settings = require('../data/settings.js');
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
            //Update minrole if given
            if (newValue = interaction.options.get("minrole")) {
                newValue = newValue.value;
                // if (newValue == interaction.guildId) newValue = null;
                logger.debug(interaction.guild, interaction.member, "new minrole:", newValue);
                settings.setMinRole(interaction.guildId, newValue);
                updated.push("minrole");
            }
            //Update maxroles if given
            if (newValue = interaction.options.get("maxroles")) {
                newValue = newValue.value;
                logger.debug(interaction.guild, interaction.member, "new maxroles:", newValue);
                settings.setMaxRoles(interaction.guildId, newValue);
                updated.push("maxroles");
            }
            //Update colorthreshold if given
            if (newValue = interaction.options.get("colorthreshold")) {
                newValue = newValue.value;
                logger.debug(interaction.guild, interaction.member, "new maxroles:", newValue);
                settings.setColorThreshold(interaction.guildId, newValue);
                updated.push("colorthreshold");
            }
            //Update adminconfig if given
            if (newValue = interaction.options.get("adminconfig") && interaction.member.id == interaction.guild.ownerId) {
                newValue = newValue.value;
                logger.debug(interaction.guild, interaction.member, "new adminconfig:", newValue);
                settings.setCanAdminConfig(interaction.guildId, newValue);
                updated.push("adminconfig");
            }

            //Respond with what has been updated (gramatically correct w/ oxford comma)
            let changed;
            if (updated.length > 1) {
                let last = updated.pop();
                changed = `\`${updated.join('`, `')}\`${updated.length > 1 ? "," : ""} and \`${last}\``
            } else if (updated.length == 1) {
                changed = `\`${updated[0]}\``
            } else {
                changed = "nothing"
            }
            logger.log(interaction.guild, interaction.member, `Updated ${changed}`);
            return interaction.reply({content: `Updated ${changed}.`, ephemeral: true});
            break;
        case 'get':
            //TODO: implement config get
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
            new SlashCommandBuilder()
                .setName(exports.help.name)
                .setDescription('Mess with the config')
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
                    .addNumberOption(option => option
                        .setName("colorthreshold")
                        .setDescription("The threshold it takes for a color to be deemed different enough for a new role"))
                    .addBooleanOption(option => option
                        .setName("adminconfig")
                        .setDescription("Can administrators change the config?")
                    )
                )
                .toJSON()
        ]
    } else {
        return [
        ]
    }
}