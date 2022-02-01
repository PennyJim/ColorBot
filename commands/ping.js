const { SlashCommandBuilder } = require('@discordjs/builders');


exports.msgrun = async (client, message, args) => {
    message.reply("My ping is \`" + client.ws.ping + " ms\`");
}

exports.slashrun = async (client, interaction) => {
    interaction.reply("My ping is \`" + client.ws.ping + " ms\`");
}

exports.help = {
    name:"ping"
}

exports.generateCommand = (isTest = false) => {
    if (!isTest) {
        return [
            new SlashCommandBuilder().setName(exports.help.name).setDescription('Replies with pong!')
        ]
    } else {
        return [

        ]
    }
}