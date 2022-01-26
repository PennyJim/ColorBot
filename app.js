const { prefix } = require("./config.json"); //Not needed?
const logger = require("./logger.js");
const { Client, Intents, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config()

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES] });

client.commands = new Collection();
client.lastCleaned = {}
// client.rolesdb = new sqlite.Database("./roles.db", (err) => {
//     if (err) {
//         logger.err(null, null, err.message);
//     }
//     logger.log(null, null, "Connected to roles database");
// })

const commandFiles = fs.readdirSync('./commands/').filter(f => f.endsWith('.js'))
for (const file of commandFiles) {
    const props = require(`./commands/${file}`)
    logger.log(null, null, `${file} loaded`)
    client.commands.set(props.help.name, props)
}

client.once('ready', () => {
    logger.log(null, null, "Ready")
})

client.on('messageCreate', async message =>
{
    if(message.author.bot) return;
    if(message.channel.type === "DM") return;

    let args = message.content.split(" ");
    let cmd = args.shift()

    let command = client.commands.get(cmd.slice(prefix.length));
    try {
        if(command) command.msgrun(client, message, args);
    } catch (error) {
        logger.err(message.guild, message.member, error);
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;
    // if (interaction.user.id != "264489096188002338" && interaction.user.id != "214446390552690689") {
    //   return await interaction.reply({content: "You are not authorized to do this.", ephemeral: true});
    // }
    // if (interaction.isGuild() && !interaction.member.hasPermission("ADMINISTRATOR")) {
    //       return await interaction.reply({content: "You are not authorized to do this.", ephemeral: true});
    // }
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
    try { // WHY IS THIS TRY CATCH NOT CATCHING ANYTHING?
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

//Token needed in config.json
client.login(process.env.TOKEN);
