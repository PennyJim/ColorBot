const { prefix } = require("./config.json"); //Not needed?
const { Client, Intents, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config()

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.commands = new Collection();
// client.rolesdb = new sqlite.Database("./roles.db", (err) => {
//     if (err) {
//         console.log(err.message);
//     }
//     console.log("Connected to roles database");
// })

const commandFiles = fs.readdirSync('./commands/').filter(f => f.endsWith('.js'))
for (const file of commandFiles) {
    const props = require(`./commands/${file}`)
    console.log(`${file} loaded`)
    client.commands.set(props.help.name, props)
}

client.once('ready', () => {
    console.log("Ready")
})

client.on('messageCreate', async message =>
{
    if(message.author.bot) return;
    if(message.channel.type === "dm") return;

    let args = message.content.split(" ");
    let cmd = messageArray.shift()

    let command = client.commands.get(cmd.slice(prefix.length));
    try {
        if(command) command.msgrun(client, message, args);
    } catch (error) {
        console.log(error);
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;
    // if (interaction.user.id != "264489096188002338" && interaction.user.id != "214446390552690689") {
    //   return await interaction.reply("You are not authorized to do this.");
    // }
    // if (interaction.isGuild() && !interaction.member.hasPermission("ADMINISTRATOR")) {
    //       return await interaction.reply("You are not authorized to do this.");
    // }

    let command = client.commands.get(interaction.commandName);
    try {
        if(command) command.slashrun(client, interaction);
    } catch (error) {
        console.log(error);
        interaction.reply(":x: Something has went wrong");
    }
  });

//Token needed in config.json
client.login(process.env.TOKEN);
