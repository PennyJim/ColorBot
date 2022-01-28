const { Client, Intents, Collection } = require('discord.js');
const rateLimiter = require('./rateLimiter.js');
const settings = require('./settings.js');
const config = require("./config.json"); //Not needed?
const logger = require("./logger.js");
const fs = require('fs');
require('dotenv').config()

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES] });

client.commands = new Collection();
client.rateLimiter = rateLimiter;
client.settings = settings;

const commandFiles = fs.readdirSync('./commands/').filter(f => f.endsWith('.js'))
for (const file of commandFiles) {
    const props = require(`./commands/${file}`)
    logger.log(null, null, `${file} loaded`)
    client.commands.set(props.help.name, props)
}

const closeFunc = () => {
    logger.log(null, null, "Closing processes");
    rateLimiter.close();
    logger.log(null, null, "Rate limit database closed");
    settings.close();
    logger.log(null, null, "Settings database closed");
    client.destroy();
    logger.log(null, null, "Discord client destroyed");

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
    // if (interaction.inGuild())
    // {
    //     let roles = interaction.guild.roles;
    //     await interaction.guild.members.fetch();
    //     (await roles.fetch()).forEach(role => {
    //         logger.debug(interaction.guild, null, "Name:", role.name, "Size:", role.members.size)
    //     });
    // }
    
    let command = client.commands.get(interaction.commandName);
    logger.debug(interaction.guild, interaction.user, "Command:", interaction.commandName)
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