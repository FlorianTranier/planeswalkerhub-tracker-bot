import { Events } from 'discord.js';

export const name = Events.InteractionCreate;

/**
 * @param {BaseInteraction} interaction
 */
export const execute = async (interaction) => {
	if (interaction.isCommand()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`,
			);
			return;
		}

		try {
			await command.execute(interaction);
		}
		catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: 'There was an error while executing this command!',
					ephemeral: true,
				});
			}
		}
	}
	else if (interaction.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`,
			);
			return;
		}
		try {
			await command.autocomplete(interaction);
		}
		catch (error) {
			console.error(error);
		}
	}
	else if (interaction.isStringSelectMenu()) {
		const command = interaction.client.commands.get(interaction.customId.split('-')[0]);
		if (!command) {
			console.error(
				`No command matching ${interaction.customId} was found.`,
			);
			return;
		}
		try {
			await command.selectMenu(interaction);
		}
		catch (error) {
			console.error(error);
		}
	}
};

export default { name, execute };
