const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const logger = require('./logger.js');
const { testServers } = require('./config.json');
// const colors = require('./colors.json');
require('dotenv').config()

const commands = [
	new SlashCommandBuilder().setName('ping').setDescription('Replies with pong!'),
    new SlashCommandBuilder()
        .setName("color")
        .setDescription("Set your color")
        .addSubcommand(subcommand => subcommand
            .setName("rgb")
            .setDescription("Set your color with Red, Green, and Blue values")
            .addIntegerOption(option => option.setName("red").setDescription("How much red").setRequired(true))
            .addIntegerOption(option => option.setName("green").setDescription("How much green").setRequired(true))
            .addIntegerOption(option => option.setName("blue").setDescription("How much blue").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand
            .setName('hex')
            .setDescription("Set your color a Hexadecimal Value")
            .addStringOption(option => option.setName("hex").setDescription("The Hex value you want").setRequired(true))
        )
        .addSubcommand(subcommand => subcommand
            .setName('named')
            .setDescription('Use a named color')
            .addStringOption(option => option
                .setName("color")
                .setDescription("The named color")
                .setRequired(true)
                // colors.forEach( color => {
                //     option.addChoice(color.name, color.hex);
                // });
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('reset')
            .setDescription("Reset your color to your default")
        ),
    new SlashCommandBuilder().setName('cleancolors').setDescription('Removes any unused color role')
].map(command => command.toJSON());

const testCommands = [
    new SlashCommandBuilder()
        .setName("color")
        .setDescription("(Test) Set your color")
]

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

rest.put(Routes.applicationCommands(process.env.CLIENTID), { body: commands })
	.then(() => console.log('Successfully registered global application commands.'))
	.catch(error => { logger.err(null, null, error) });
for (const server in testServers) {
    rest.put(Routes.applicationGuildCommands(process.env.CLIENTID, server), { body: testCommands })
        .then(() => console.log('Successfully registered testing application commands.'))
        .catch(error => { logger.err({id: server}, null, error) });
}
