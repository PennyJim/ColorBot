const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { testServers } = require('./config.json');
const logger = require('./logger.js');
const fs = require('fs');
require('dotenv').config()


let globalCommands = [], testCommands = []
const commandFiles = fs.readdirSync('./commands/').filter(f => f.endsWith('.js'))
for (const file of commandFiles) {
    const props = require(`./commands/${file}`)
    logger.log(null, null, `${file} loaded`)
    globalCommands = globalCommands.concat(props.generateCommand());
    testCommands = testCommands.concat(props.generateCommand(true));
}

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

rest.put(Routes.applicationCommands(process.env.CLIENTID), { body: globalCommands })
	.then(() => logger.log(null, null, 'Successfully registered global application commands.'))
	.catch(error => logger.err(null, null, error));
for (const server of testServers) {
    rest.put(Routes.applicationGuildCommands(process.env.CLIENTID, server), { body: testCommands })
        .then(() => logger.log({id: server}, null, 'Successfully registered testing application commands.'))
        .catch(error => logger.err({id: server}, null, error));
}
require("./data/settings").close();