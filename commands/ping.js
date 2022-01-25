exports.msgrun = async (client, message, args) => {
    message.reply("My ping is \`" + client.ws.ping + " ms\`");
}

exports.slashrun = async (client, interaction) => {
    interaction.reply("My ping is \`" + client.ws.ping + " ms\`");
}

exports.help = {
    name:"ping"
}
