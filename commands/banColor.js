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
    name:"bancolor",
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
                .setDescription("(Test) Ban a color from use")
                .addSubcommand(subcommand => subcommand
                    .setName("rgb")
                    .setDescription("Set your color with Red, Green, and Blue values")
                    .addIntegerOption(option => option.setName("red").setDescription("How much red").setRequired(true))
                    .addIntegerOption(option => option.setName("green").setDescription("How much green").setRequired(true))
                    .addIntegerOption(option => option.setName("blue").setDescription("How much blue").setRequired(true))
                    .addNumberOption(option => option
                        .setName("threshold")
                        .setDescription("How close you can get")
                        .setRequired(true)
                    )
                )
                .addSubcommand(subcommand => subcommand
                    .setName('hex')
                    .setDescription("Set your color a Hexadecimal Value")
                    .addStringOption(option => option.
                        setName("hex")
                        .setDescription("The Hex value you want")
                        .setRequired(true)
                    )
                    .addNumberOption(option => option
                        .setName("threshold")
                        .setDescription("How close you can get")
                        .setRequired(true)
                    )
                )
                .addSubcommand(subcommand => subcommand
                    .setName('named')
                    .setDescription('Use a named color')
                    .addStringOption(option => option
                        .setName("color")
                        .setDescription("The named color")
                        .setRequired(true)
                    )
                    .addNumberOption(option => option
                        .setName("threshold")
                        .setDescription("How close you can get")
                        .setRequired(true)
                    )
                )
                .toJSON()
        ]
    }
}