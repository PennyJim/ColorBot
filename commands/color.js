const { SlashCommandBuilder } = require('@discordjs/builders');
const chalk  = require('chalk');
const colors = require('../colors.json');
const logger = require("../logger.js");

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
  
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
let hexRegex = /^#[\da-f]{6}$/i

exports.msgrun = async (client, message, args) => {
    // logger.debug(message.guild, message.member, message);
    logger.debug(message.guild, message.member, args);
    message.reply({content: "Test", ephemeral: true});
}

exports.slashrun = async (client, interaction) => {
    logger.debug(interaction.guild, interaction.member, "Subcommand:", interaction.options.getSubcommand(false))
    

    if(!interaction.inGuild()) { return interaction.reply({content: "Has to be called in a server", ephemeral: true});}

    let roles = interaction.guild.roles;
    let botRole = roles.botRoleFor(client.user);
    let options = interaction.options;

    let hex, newColor;
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

            newColor = `rgb(${r}, ${g}, ${b})`
            hex = rgbToHex(r, g, b);
            break;
        case "hex":
            //Validate hex is valid
            temp_hex = options.getString("hex");
            if (temp_hex.charAt(0) != '#') { temp_hex = "#" + temp_hex; }
            if (temp_hex.match(hexRegex)) {
                newColor = temp_hex;
                hex = newColor;
            }
            else {
                logger.warn(interaction.guild, interaction.member, `${temp_hex} is not a valid color`)
                return interaction.reply({content: `${temp_hex} is not a valid color`, ephemeral: true});
            }
            break;
        case "named":
            newColor = options.getString("color");
            let tempColor = colors[newColor.toUpperCase()];
            logger.debug(interaction.guild, interaction.member, tempColor);
            if (tempColor !== undefined) {
                hex = tempColor.hex;
            } else {
                return interaction.reply({content: `The color "${newColor}" is not a valid named html color`, ephemeral: true});
            }
            break;
        case "reset":
            skipAssign = true;
            break;
        default:
            logger.err(interaction.guild, interaction.member, `Subcommand "${options.getSubcommand(false)}" is not implemented.`);
            return interaction.reply({content: `Subcommand "${options.getSubcommand(false)}" is not implemented.`, ephemeral: true});
    }

    let newRole;
    if (!skipAssign) {
        logger.debug(interaction.guild, interaction.member, "NewColor: ", chalk.hex(hex)(newColor));
        logger.debug(interaction.guild, interaction.member, "HEX: ", chalk.hex(hex)(hex));

        newRole = roles.cache.find(r => r.name == hex);
        if (newRole === undefined) {
            newRole = await roles.create({name:hex,color:hex,mentionable:false,hoist:false,position:botRole.position,reason:"New color role needed"})
        }
    }
    let oldRoles = []
    interaction.member.roles.cache.forEach(r => {
        if (r.name.match(hexRegex) && (skipAssign || r.id != newRole.id)) {
            if (r.members.size != 1) {
                oldRoles.push(r.id)
            } else {
                r.delete("A newly unused color role");
            }
        }
    })
    logger.debug(interaction.guild, interaction.member, oldRoles);
    if (oldRoles.length != 0) {
        await interaction.member.roles.remove(oldRoles, "Replacing this member's color role")
        .then(() => {},
        error =>{logger.error(interaction.guild, interaction.member, error)});
    }
    if (!skipAssign) {
        await interaction.member.roles.add(newRole, "Replacing this member's color role");
        await interaction.reply({content: `Your color has been changed to \`${newColor}\``, ephemeral: true});
    } else {
        await interaction.reply({content: "Your color has been reset", ephemeral: true});
    }

    // let standardText = 'color: #ffffff;'
    // let quietText = 'color: #999999;'
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
                    .setDescription('Use a named color')
                    .addStringOption(option => option
                        .setName("color")
                        .setDescription("The named color")
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
        ]
    } else {
        return [
            new SlashCommandBuilder()
                .setName(exports.help.name)
                .setDescription("(Test) Set your color")
        ]
    }
}
