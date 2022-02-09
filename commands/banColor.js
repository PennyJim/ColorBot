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
    
    interaction.reply({content: "My ping is \`" + client.ws.ping + " ms\`", ephemeral: true});
}

exports.help = {
    name:"bannedcolors",
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
                .addSubcommandGroup(group => group.setName("add")
                    .setDescription("Add a banned color")
                    .addSubcommand(subcommand => subcommand.setName("rgb")
                        .setDescription("Set the banned color with Red, Green, and Blue values")
                        .addIntegerOption(option => option.setName("red").setDescription("How much red").setRequired(true))
                        .addIntegerOption(option => option.setName("green").setDescription("How much green").setRequired(true))
                        .addIntegerOption(option => option.setName("blue").setDescription("How much blue").setRequired(true))
                        .addNumberOption(option => option
                            .setName("threshold")
                            .setDescription("How close you can get to the banned color")
                            .setRequired(true)
                        )
                    )
                    .addSubcommand(subcommand => subcommand.setName('hex')
                        .setDescription("Set the banned color with a Hexadecimal Value")
                        .addStringOption(option => option.
                            setName("hex")
                            .setDescription("The Hex value you want")
                            .setRequired(true)
                        )
                        .addNumberOption(option => option
                            .setName("threshold")
                            .setDescription("How close you can get to the banned color")
                            .setRequired(true)
                        )
                    )
                    .addSubcommand(subcommand => subcommand.setName('named')
                        .setDescription('Ban a named HTML color')
                        .addStringOption(option => option
                            .setName("color")
                            .setDescription("The named HTML color")
                            .setRequired(true)
                        )
                        .addNumberOption(option => option
                            .setName("threshold")
                            .setDescription("How close you can get to the banned color")
                            .setRequired(true)
                        )
                    )
                )
                .addSubcommand(subcommand => subcommand.setName("remove")
                    .setDescription("Pick a color to remove")
                    .addIntegerOption(option => option
                        .setName("index")
                        .setDescription("The index of the color to unban")
                        .setRequired(true)
                    )
                )
                .addSubcommand(subcommand => subcommand.setName("update")
                    .setDescription("Pick a color to update the threshold of")
                    .addIntegerOption(option => option
                        .setName("index")
                        .setDescription("The index of the color to unban")
                        .setRequired(true)
                    )
                    .addNumberOption(option => option
                        .setName("threshold")
                        .setDescription("The new threshold of the banned color")
                        .setRequired(true)
                    )
                )
                .addSubcommand(subcommand => subcommand.setName("list")
                    .setDescription("Lists what colors are banned")
                )
                .toJSON()
        ]
    }
}