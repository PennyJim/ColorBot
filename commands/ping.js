const { SlashCommandBuilder } = require('@discordjs/builders');


exports.msgrun = async (client, message, args) => {
    message.reply({content: "My ping is \`" + client.ws.ping + " ms\`", ephemeral: true});
}

exports.slashrun = async (client, interaction) => {
    interaction.reply({content: "My ping is \`" + client.ws.ping + " ms\`", ephemeral: true});
}

exports.help = {
    name:"ping"
}

exports.generateCommand = (isTest = false) => {
    if (!isTest) {
        return [
            new SlashCommandBuilder()
                .setName(exports.help.name)
                .setDescription('Replies with pong!')
                .toJSON()
        ]
    } else {
        return [

        ]
    }
}