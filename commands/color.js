const { SlashCommandBuilder } = require('@discordjs/builders');
const colorRoles = require('../data/colorRoles.js');
const settings = require('../data/settings.js');
const logger = require("../logger.js");
const chalk  = require('chalk');
const colorSpace = require('../colorSpace.js');
const colors = require('../colors.json');

let hexRegex = /^#[\da-f]{6}$/i

exports.msgrun = async (client, message, args) => {
    // logger.debug(message.guild, message.member, message);
    logger.debug(message.guild, message.member, args);
    message.reply({content: "Test", ephemeral: true});
}

exports.slashrun = async (client, interaction) => {
    if(!interaction.inGuild())
        return interaction.editReply({content: "Has to be called in a server", ephemeral: true});
    if(interaction.member.roles.highest.comparePositionTo(settings.getMinRole(interaction.guildId)) < 0)
        return interaction.editReply({content: "You do not have permission to do this", ephemeral: true});

    let roles = interaction.guild.roles;
    let botRole = roles.botRoleFor(client.user);
    let highestBotRole = interaction.guild.me.roles.highest;
    let options = interaction.options;

    //Resolve the color
    let hex, lab, newColor;
    let skipAssign = false;
    switch (options.getSubcommand(false))
    {
        case "rgb":
            r = options.getInteger("red");
            g = options.getInteger("green");
            b = options.getInteger("blue");

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
        case "reset":
            skipAssign = true;
            break;
        default:
            logger.err(interaction.guild, interaction.member, `Subcommand "${options.getSubcommand(false)}" is not implemented.`);
            return interaction.editReply({content: `Subcommand "${options.getSubcommand(false)}" is not implemented.`, ephemeral: true});
    }
    hex = hex.toUpperCase();

    let newRole; // Make new role
    if (!skipAssign) {
        logger.debug(interaction.guild, interaction.member, "NewColor: ", chalk.hex(hex)(newColor));
        logger.debug(interaction.guild, interaction.member, "HEX:", chalk.hex(hex)(hex));
        logger.debug(interaction.guild, interaction.member, "LAB:", colorSpace.hex2lab(hex))

        //Check against banned colors
        //TODO: Move it to within colorRoles.js
        let bannedColors = settings.getBannedColors(interaction.guildId);
        for (const banned of bannedColors) {
            if (colorSpace.labDeltaE(lab, banned) <= banned[3]) {
                logger.warn(interaction.guild, interaction.member, "Too close to a banned color");
                return await interaction.editReply({content: `Too close to the banned color ${banned[4]}`, ephemeral: true});
            }
        }

        
        //Look for the role to apply, or make it
        // newRole = roles.cache.find(r => r.name == hex && r.comparePositionTo(highestBotRole) < 0);
        // if (newRole === undefined) {
        //     newRole = await roles.create({
        //         name: hex,
        //         color: hex,
        //         mentionable: false,
        //         hoist: false,
        //         position: botRole.position,
        //         permissions: [],
        //         reason: "New color role needed"
        //     })
        // }

        newRole = await colorRoles.requestNewRole(interaction.guild, hex, settings.getColorThreshold(interaction.guildId))
        await interaction.member.roles.add(newRole, "Replacing this member's color role");
    }

    let oldRoles = [] // Remove or delete old roles
    interaction.member.roles.cache.forEach(r => {
        if (r.name.match(hexRegex) && (skipAssign || r.id != newRole.id)) {
            if (r.comparePositionTo(highestBotRole) >= 0) {
                logger.warn(interaction.guild, interaction.member, "Can't affect role:", r.name, r.id);
            } else if (r.members.size != 1) {
                interaction.member.roles.remove(oldRoles, "Replacing this member's color role")
            } else {
                r.delete("A newly unused color role");
            }
            oldRoles.push(r.id)
        }
    });
    
    if (!skipAssign) {
        await interaction.editReply({content: `Your color has been changed to \`${newColor}\`: <@&${newRole.id}>`, ephemeral: true})
    } else {
        await interaction.editReply({content: "Your color has been reset", ephemeral: true});
    }

    logger.log(interaction.guild, interaction.member, `Color changed to`, chalk.hex(hex)(hex));
}

exports.help = {
    name:"color",
    limit: "color",
    limitScope: "user"
}
exports.generateCommand = (isTest = false) => {
    if (!isTest) {
        return [
            new SlashCommandBuilder()
                .setName(exports.help.name)
                .setDescription("Set your color")
                .addSubcommand(subcommand => subcommand
                    .setName("rgb")
                    .setDescription("Set your color with Red, Green, and Blue values")
                    .addIntegerOption(option => option.setName("red").setDescription("How much red").setRequired(true))
                    .addIntegerOption(option => option.setName("green").setDescription("How much green").setRequired(true))
                    .addIntegerOption(option => option.setName("blue").setDescription("How much blue").setRequired(true))
                )
                .addSubcommand(subcommand => subcommand
                    .setName('hex')
                    .setDescription("Set your color a Hexadecimal Value")
                    .addStringOption(option => option.setName("hex").setDescription("The Hex value you want").setRequired(true))
                )
                .addSubcommand(subcommand => subcommand
                    .setName('named')
                    .setDescription('Use a named HTML color')
                    .addStringOption(option => option
                        .setName("color")
                        .setDescription("The named HTML color")
                        .setRequired(true)
                        // colors.forEach( color => {
                        //     option.addChoice(color.name, color.hex);
                        // });
                    )
                )
                .addSubcommand(subcommand => subcommand
                    .setName('reset')
                    .setDescription("Reset your color to your default")
                )
                .toJSON()
        ]
    } else {
        return [
            new SlashCommandBuilder()
                .setName(exports.help.name)
                .setDescription("(Test) Set your color")
                .toJSON()
        ]
    }
}
