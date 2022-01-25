let hexRegex = /^#[\da-f]{6}$/i
exports.run = async (client, guild) => {
    console.log("Deleting old color roles");

    let oldRoles = 0;
    guild.roles.cache.forEach(r => {
        if (r.name.match(hexRegex) && r.members.size == 0)
        {
            r.delete("An unused color role");
            oldRoles++;
        }
    });

    console.log(`Deleted ${oldRoles} role(s)`);
}

exports.msgrun = async (client, message, args) => {
    if (!message.inGuild()) { return message.reply("This only works in guilds"); }
    //Check for permission inside the guild
    if (!message.member.permissions.has("MANAGE_ROLES")) { return interaction.reply("You do not have permission to do this"); }

    this.run(client, message.guild).then(() => {
        message.reply("The colors have been cleaned up");
    }, error => {
        message.reply("Something has gone wrong");
    });
}

exports.slashrun = async (client, interaction) => {
    if (!interaction.inGuild()) { return interaction.reply("This only works in guilds"); }
    //Check for permission inside the guild
    if (!interaction.member.permissions.has("MANAGE_ROLES")) { return interaction.reply("You do not have permission to do this"); }

    this.run(client, interaction.guild).then(() => {
        interaction.reply("The colors have been cleaned up");
    }, error => {
        interaction.reply("Something has gone wrong");
    });
}


exports.help = {
    name:"cleancolors"
}
