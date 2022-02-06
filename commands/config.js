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