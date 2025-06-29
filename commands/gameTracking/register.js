import {
	SlashCommandBuilder,
	ActionRowBuilder,
	TextDisplayBuilder,
	StringSelectMenuBuilder,
	MessageFlags,
} from 'discord.js';
import { MeiliSearch } from 'meilisearch';
import { createClient } from '@supabase/supabase-js';
import { buildGameResultMessage } from '../../utilities/GameResultMessageBuilder.js';

const meilisearch = new MeiliSearch({
	host: process.env.MEILI_HOST,
	apiKey: process.env.MEILI_KEY,
});

// Create a single supabase client for interacting with your database
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_KEY,
);

const searchIndex = meilisearch.index('magic-cards-full-v2');

export const data = new SlashCommandBuilder()
	.setName('register')
	.setDescription('Register a magic game')
	.addUserOption((option) =>
		option.setName('player1').setDescription('Player 1').setRequired(true),
	)
	.addStringOption((option) =>
		option
			.setName('commander1')
			.setDescription('Commander 1')
			.setRequired(true)
			.setAutocomplete(true),
	)
	.addUserOption((option) =>
		option.setName('player2').setDescription('Player 2').setRequired(true),
	)
	.addStringOption((option) =>
		option
			.setName('commander2')
			.setDescription('Commander 2')
			.setRequired(true)
			.setAutocomplete(true),
	)
	.addUserOption((option) =>
		option.setName('player3').setDescription('Player 3').setRequired(false),
	)
	.addStringOption((option) =>
		option
			.setName('commander3')
			.setDescription('Commander 3')
			.setRequired(false)
			.setAutocomplete(true),
	)
	.addUserOption((option) =>
		option.setName('player4').setDescription('Player 4').setRequired(false),
	)
	.addStringOption((option) =>
		option
			.setName('commander4')
			.setDescription('Commander 4')
			.setRequired(false)
			.setAutocomplete(true),
	)
	.addUserOption((option) =>
		option.setName('player5').setDescription('Player 5').setRequired(false),
	)
	.addStringOption((option) =>
		option
			.setName('commander5')
			.setDescription('Commander 5')
			.setRequired(false)
			.setAutocomplete(true),
	);

export const autocomplete = async (interaction) => {
	const focusedValue = interaction.options.getFocused();
	const search = await searchIndex.search(focusedValue, {
		limit: 2,
		attributesToRetrieve: ['name', 'oracle_id'],
		distinct: 'oracle_id',
	});
	const choices = search.hits.map((hit) => ({ name: hit.name, id: hit.oracle_id }));
	await interaction.respond(
		choices.map((choice) => ({ name: choice.name, value: JSON.stringify({ id: choice.id, name: choice.name }) })),
	);
};

/**
 * @param {ChatInputCommandInteraction} interaction
 */
export const execute = async (interaction) => {
	const player1 = interaction.options.getUser('player1');
	const player2 = interaction.options.getUser('player2');
	const player3 = interaction.options.getUser('player3');
	const player4 = interaction.options.getUser('player4');
	const player5 = interaction.options.getUser('player5');

	const players = [player1, player2, player3, player4, player5].filter(
		(player) => player !== null,
	);

	const commanders = [
		interaction.options.getString('commander1') ? JSON.parse(interaction.options.getString('commander1')).id : null,
		interaction.options.getString('commander2') ? JSON.parse(interaction.options.getString('commander2')).id : null,
		interaction.options.getString('commander3') ? JSON.parse(interaction.options.getString('commander3')).id : null,
		interaction.options.getString('commander4') ? JSON.parse(interaction.options.getString('commander4')).id : null,
		interaction.options.getString('commander5') ? JSON.parse(interaction.options.getString('commander5')).id : null,
	].filter((commander) => commander !== null);

	const { data: game } = await supabase
		.from('tracker_game')
		.insert({
			guild_id: interaction.guild.id,
			guild_name: interaction.guild.name,
		})
		.select()
		.order('created_at', { ascending: false })
		.single();

	const components = [];

	for (let i = 0; i < players.length; i++) {
		await supabase
			.from('tracker_game_results')
			.insert({
				game_id: game.id,
				player_id: players[i].id,
				player_name: players[i].displayName,
				commander_id: commanders[i],
				commander_name: commanders[i] ? JSON.parse(interaction.options.getString(`commander${i + 1}`)).name : null,
			});

		const player = players[i];
		const commander = interaction.options.getString(`commander${i + 1}`) ? JSON.parse(interaction.options.getString(`commander${i + 1}`)).name : null;

		components.push(new TextDisplayBuilder().setContent(
			`${player.displayName} / ${commander} (position 1 to ${players.length})`,
		));

		components.push(new ActionRowBuilder().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(`register-${game.id}-${player.id}-position`)
				.setPlaceholder('Select player\'s position')
				.setOptions(
					Array.from({ length: players.length }, (_, index) => ({
						label: `Position ${index + 1}`,
						value: (index + 1).toString(),
					})),
				),
		));
	}

	await interaction.reply({
		components: components,
		flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
	});
};

/**
 *
 * @param {StringSelectMenuInteraction} interaction
 */
export const selectMenu = async (interaction) => {
	const [, gameId, playerId] = interaction.customId.split('-');
	await supabase.from('tracker_game_results').update({
		player_position: interaction.values[0],
	}).eq('game_id', gameId).eq('player_id', playerId);

	await interaction.deferUpdate();

	const { data: results } = await supabase.from('tracker_game_results').select('*').eq('game_id', gameId);

	if (results.every((result) => result.player_position !== null)) {
		await interaction.editReply({
			components: [
				new TextDisplayBuilder().setContent('Game registered!'),
			],
			flags: [MessageFlags.IsComponentsV2],
		});

		await interaction.followUp({
			components: await buildGameResultMessage(gameId),
			flags: [MessageFlags.IsComponentsV2],
		});
	}
};
