'use strict';
const { Client, Intents, Collection } = require('discord.js');
const rateLimiter = require('./data/rateLimiter.js');
const settings = require('./data/settings.js');
const config = require("./config.json");
const logger = require("./logger.js");
const nodeCron = require('node-cron');
const fs = require('fs');
require('dotenv').config()

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES] });

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands/').filter(f => f.endsWith('.js'))
for (const file of commandFiles) {
    const props = require(`./commands/${file}`)
    logger.log(null, null, `${file} loaded`)
    client.commands.set(props.help.name, props)
}

const closeFunc = () => {
    logger.log(null, null, "Closing processes");
    client.destroy();
    logger.log(null, null, "Discord client destroyed");
    rateLimiter.close();
    logger.log(null, null, "Rate limit database closed");
    settings.close();
    logger.log(null, null, "Settings database closed");

    logger.log(null, null, "Done");
}
process.on("SIGQUIT", closeFunc);
process.on("SIGTERM", closeFunc);
process.on("SIGINT", closeFunc);

client.once('ready', () => {
    logger.log(null, null, "Ready");
})

client.on('messageCreate', async message => {
    if(message.author.bot) return;                          //Ignore bots
    if(message.channel.type === "DM") return;               //Ignore dms
    if(message.content.charAt(0) != config.prefix) return;  //Ignore messages
    if(!config.testServers.includes(message.guildId)) return;//Only listen to messages on a test server

    let args = message.content.split(" ");
    let cmd = args.shift()

    let command = client.commands.get(cmd.slice(config.prefix.length));
    try {
        if(command) command.msgrun(client, message, args);
    } catch (error) {
        logger.err(message.guild, message.member, error);
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;

    let command = client.commands.get(interaction.commandName);
    logger.debug(interaction.guild, interaction.user, "Command:", command.help)

    let limited = undefined;
    if (command.help.limit) {
        let id;
        switch (command.help.limitScope) {
            case "guild":
                id = interaction.guildId;
                break;
            case "user":
                id = interaction.user.id
                break;
            default:
                throw new Error(`Uknown rate limit scope: ${command.help.limitScope}`);
        }
        limited = rateLimiter.useLimit(id, command.help.limit);
    }
    if (limited) return interaction.reply({content: `You can do this again: <t:${limited}:R>`, ephemeral: true});

    try {
        await interaction.guild.members.fetch();
        if(command) await command.slashrun(client, interaction);
    } catch (error) {
        logger.err(interaction.guild, interaction.user, error);
        logger.debug(null, null, interaction.replied)
        if (interaction.replied) {
            // interaction.followUp(":x: Something has went wrong");
        } else {
            await interaction.reply({content: ":x: Something has went wrong", ephemeral: true});
        }
    }
  });


//Token needed in .env
client.login(process.env.TOKEN);