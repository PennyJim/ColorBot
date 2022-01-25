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
    console.log("Subcommand: ", interaction.options.getSubcommand())
    console.log("Options: ", interaction.options.data);
    

    if(!interaction.inGuild()) { interaction.reply("Has to be called in a server"); return;}

    let roles = interaction.guild.roles;
    let botRole = roles.botRoleFor(client.user);
    let options = interaction.options;
    // console.log(roles.cache);

    let hex;
    switch (options.getSubcommand())
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

            console.log(`RGB: (${r}, ${g}, ${b})`);
            hex = rgbToHex(r, g, b);
            break;
        case "hex":
            //Validate hex is valid
            temp_hex = options.getString("hex");
            if (temp_hex.charAt(0) != '#') { temp_hex = "#" + temp_hex; }
            if (temp_hex.match(hexRegex)) {
                hex = temp_hex;
            }
            else {
                interaction.reply(`${options.getString("hex")} is not a valid color`);
            }
            break;
        default:
            interaction.reply(`Subcommand "${options.getSubcommand()}" is not implemented.`)
            break;
    }
    console.log("HEX: ", hex);

    let newRole = roles.cache.find(r => r.name == hex);
    if (newRole === undefined) {
        newRole = await roles.create({name:hex,color:hex,mentionable:false,hoist:false,position:botRole.position,reason:"New color role needed"})
    }
    let oldRoles = []
    interaction.member.roles.cache.forEach(r => {
        if (r.name.match(hexRegex)) {
            if (r.members.size != 1) {
                oldRoles.push(r.id)
            } else {
                r.delete("A newly unused color role");
            }
        }
    })
    console.log(oldRoles);
    if (oldRoles.length != 0) { await interaction.member.roles.remove(oldRoles, "Replacing this member's color role").then(() => {}, error => {console.log(error)}); }
    await interaction.member.roles.add(newRole, "Replacing this member's color role");

    interaction.reply(`Your color has been changed to \`${hex}\``);
}

exports.help = {
    name:"color"
}
