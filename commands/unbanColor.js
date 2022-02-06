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
    
    interaction.reply({content: "My ping is \`" + client.ws.ping + " ms\`", ephemeral: true});
}

exports.help = {
    name:"unbancolor",
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
                .setDescription("(Test) Unban a color from use")
                .addSubcommand(subcommand => subcommand
                    .setName("list")
                    .setDescription("Lists what colors are banned")
                )
                .addSubcommand(subcommand => subcommand
                    .setName("color")
                    .setDescription("Choose the color to unban")
                    .addIntegerOption(option => option
                        .setName("index")
                        .setDescription("The index of the color to unban")
                    )
                )
                .toJSON()
        ]
    }
}