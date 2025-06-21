import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});

client.commands = new Collection();

async function loadCommands() {
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs
			.readdirSync(commandsPath)
			.filter((file) => file.endsWith('.js'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const fileUrl = `file://${filePath}`;
			try {
				const command = await import(fileUrl);
				// Set a new item in the Collection with the key as the command name and the value as the exported module
				if ('data' in command && 'execute' in command) {
					client.commands.set(command.data.name, command);
				}
				else {
					console.log(
						`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
					);
				}
			}
			catch (error) {
				console.error(
					`[ERROR] Failed to load command from ${filePath}:`,
					error,
				);
			}
		}
	}
}

async function loadEvents() {
	const eventsPath = path.join(__dirname, 'events');
	const eventFiles = fs
		.readdirSync(eventsPath)
		.filter((file) => file.endsWith('.js'));
	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const fileUrl = `file://${filePath}`;
		try {
			const event = await import(fileUrl);
			console.log(`Loading event: ${event.name}`);
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args));
			}
			else {
				client.on(event.name, (...args) => event.execute(...args));
			}
		}
		catch (error) {
			console.error(`[ERROR] Failed to load event from ${filePath}:`, error);
		}
	}
}

// Load commands before setting up event handlers
(async () => {
	console.log('Loading commands...');
	await loadCommands();
	console.log('Loading events...');
	await loadEvents();
	console.log('Commands and events loaded successfully!');
})();

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
