const { SlashCommandBuilder } = require('@discordjs/builders');
const settings = require('../data/settings.js');
const logger = require("../logger.js");
const chalk  = require('chalk');
const colorSpace = require('../colorSpace.js');
const colors = require("../colors.json");

exports.msgrun = async (client, message, args) => {
    message.reply({content: "My ping is \`" + client.ws.ping + " ms\`", ephemeral: true});
}

exports.slashrun = async (client, interaction) => {
    if (!interaction.inGuild())
        return interaction.editReply({content: "This only works in guilds", ephemeral: true});
    if (interaction.member.id !== interaction.guild.ownerId &&
        !(settings.getCanAdminConfig(interaction.guild.id) && interaction.memberPermissions.has("ADMINISTRATOR")))
        return interaction.editReply({content: "You do not have permission to do this", ephemeral: true});


    let guildId = interaction.guildId;
    let options = interaction.options;

    //Resolve the color
    let hex, lab, newColor;
    if (options.getSubcommandGroup(false) == "add") {
        switch (options.getSubcommand(false))
        {
            case "rgb":
                let r = options.getInteger("red");
                let g = options.getInteger("green");
                let b = options.getInteger("blue");

                //Clamp rgb values within range
                if (r < 0) { r = 0; }
                if (r > 255) { r = 255; }
                if (g < 0) { r = 0; }
                if (g > 255) { r = 255; }
                if (b < 0) { r = 0; }
                if (b > 255) { r = 255; }

                newColor = `rgb(${r}, ${g}, ${b})`;
                let rgb = [r, g, b];
                hex = colorSpace.rgb2hex(rgb);
                lab = colorSpace.rgb2lab(rgb)
                break;
            case "hex":
                //Validate hex is valid
                temp_hex = options.getString("hex");
                if (temp_hex.charAt(0) != '#') { temp_hex = "#" + temp_hex; }
                if (temp_hex.match(hexRegex)) {
                    newColor = temp_hex;
                    hex = newColor;
                    lab = colorSpace.hex2lab(hex);
                }
                else {
                    logger.warn(interaction.guild, interaction.member, `${temp_hex} is not a valid color`)
                    return interaction.editReply({content: `${temp_hex} is not a valid color`, ephemeral: true});
                }
                break;
            case "named":
                newColor = options.getString("color");
                let tempColor = colors[newColor.toUpperCase()];
                if (tempColor !== undefined) {
                    hex = tempColor.hex;
                    lab = colorSpace.hex2lab(hex);
                } else {
                    return interaction.editReply({content: `The color "${newColor}" is not a valid named html color`, ephemeral: true});
                }
                break;
            default:
                logger.err(interaction.guild, interaction.member, `Subcommand "${options.getSubcommand(false)}" is not implemented.`);
                return interaction.editReply({content: `Subcommand "${options.getSubcommand(false)}" is not implemented.`, ephemeral: true});
        }
    } else if (options.getSubcommand(false) == "list") {
        //List banned colors
        let bannedColors = settings.getBannedColors(guildId);
        let bannedList = "Id:Hex - Threshold"
        for (const color of bannedColors) {
            bannedList += `\n\`${color[5]}\`:\`${color[4]}\` - \`${color[3]}\``;
        }
        return interaction.editReply({content: bannedList, ephemeral: true});
    }

    //Get and clamp the threshold to between 50 and 1
    //Unless the threshold resolves for false, then leave it alone so it can delete
    let threshold = options.getNumber("threshold", false);
    if (threshold > 50) threshold = 50;
    if (threshold && threshold < 1) threshold = 1;
    try {
        //Get index and resolve that it's valid for the guild
        let index = options.getInteger("index", true); //Throw error if no index
        let bannedColor = settings.getBannedColor(guildId, index);
        if (bannedColor === undefined) return interaction.editReply({
            content: `${index} is not a valid Id. Use \`/${exports.help.name} list\` to list the Id's.`, 
            ephemeral: true
        });
        hex = bannedColor.hex_value;
        if (threshold) { //Update threshold if one is given
            settings.setBannedThreshold(guildId, index, threshold);
            logger.log(interaction.guild, interaction.member, `${index}:${chalk.hex(hex)(hex)} has been updated`);
            return interaction.editReply({content: `Set \`${index}\`:\`${hex}\`'s threshold to \`${threshold}\`.`, ephemeral: true});
        }
        //Remove the banned color if threshold isn't given (or is 0)
        settings.removeBannedColor(guildId, index);
        logger.log(interaction.guild, interaction.member, `${index}:${chalk.hex(hex)(hex)} has been deleted`);
        return interaction.editReply({content: `Removed \`${index}\`:\`${hex}\`.`, ephemeral: true});
    } catch (err) {
        if (err.name != "TypeError [COMMAND_INTERACTION_OPTION_NOT_FOUND]") throw err;
        if (!threshold) threshold = 1;

        //Add the banned color if no index was given
        let index = settings.addBannedColor(guildId, hex, lab, threshold).lastInsertRowid;
        logger.log(interaction.guild, interaction.member, `${index}:${chalk.hex(hex)(hex)} has been added`);
        return interaction.editReply({content: `Added \`${index}\`:\`${hex}\` to the banned colors with a threshold of \`${threshold}\`.`, ephemeral: true})
    }
}

exports.help = {
    name:"bannedcolors",
    limit: "config",
    limitScope: "guild"
}

exports.generateCommand = (isTest = false) => {
    if (!isTest) {
        return [
            new SlashCommandBuilder()
                .setName(exports.help.name)
                .setDescription("Ban a color from use")
                .addSubcommandGroup(group => group.setName("add")
                    .setDescription("Add a banned color")
                    .addSubcommand(subcommand => subcommand.setName("rgb")
                        .setDescription("Ban a color with Red, Green, and Blue values")
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
                        .setDescription("Ban a color by Hexadecimal Value")
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
    } else {
        return [
        ]
    }
}