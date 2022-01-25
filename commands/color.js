const colors = require('../colors.json');

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
  
function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
let hexRegex = /^#[\da-f]{6}$/i

exports.msgrun = async (client, message, args) => {
    console.log(message);
    console.log(args);
    message.reply("Test");
}

exports.slashrun = async (client, interaction) => {
    // console.log(interaction)
    console.log("Subcommand: ", interaction.options.getSubcommand(false))
    console.log("Options: ", interaction.options.data);
    

    if(!interaction.inGuild()) { interaction.reply("Has to be called in a server"); return;}

    let roles = interaction.guild.roles;
    let botRole = roles.botRoleFor(client.user);
    let options = interaction.options;
    // console.log(roles.cache);

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
                return interaction.reply(`${options.getString("hex")} is not a valid color`);
            }
            break;
        case "named":
            newColor = options.getString("color");
            let tempColor = colors[newColor.toUpperCase()];
            console.log(tempColor);
            if (tempColor !== undefined) {
                hex = tempColor.hex;
            } else {
                return interaction.reply(`The color "${newColor}" is not a valid named html color`);
            }
            break;
        case "reset":
            skipAssign = true;
            break;
        default:
            return interaction.reply(`Subcommand "${options.getSubcommand(false)}" is not implemented.`);
    }
    console.log("NewColor: ", newColor);
    console.log("HEX: ", hex);

    let newRole;
    if (!skipAssign) {
        newRole = roles.cache.find(r => r.name == hex);
        if (newRole === undefined) {
            newRole = await roles.create({name:hex,color:hex,mentionable:false,hoist:false,position:botRole.position,reason:"New color role needed"})
        }
    }
    let oldRoles = []
    interaction.member.roles.cache.forEach(r => {
        if (r.name.match(hexRegex) && r.id != newRole.id) {
            if (r.members.size != 1) {
                oldRoles.push(r.id)
            } else {
                r.delete("A newly unused color role");
            }
        }
    })
    console.log(oldRoles);
    if (oldRoles.length != 0) { await interaction.member.roles.remove(oldRoles, "Replacing this member's color role").then(() => {}, error => {console.log(error)}); }
    if (!skipAssign) {
        await interaction.member.roles.add(newRole, "Replacing this member's color role");
        interaction.reply(`Your color has been changed to \`${newColor}\``);
    } else {
        interaction.reply("Your color has been reset");
    }
}

exports.help = {
    name:"color"
}
