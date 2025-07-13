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
		option.setName('player1').setDescription('Player 1 (Discord user)').setRequired(false),
	)
	.addStringOption((option) =>
		option.setName('guest1').setDescription('Player 1 (Guest name)').setRequired(false),
	)
	.addStringOption((option) =>
		option
			.setName('commander1')
			.setDescription('Commander 1')
			.setRequired(false)
			.setAutocomplete(true),
	)
	.addUserOption((option) =>
		option.setName('player2').setDescription('Player 2 (Discord user)').setRequired(false),
	)
	.addStringOption((option) =>
		option.setName('guest2').setDescription('Player 2 (Guest name)').setRequired(false),
	)
	.addStringOption((option) =>
		option
			.setName('commander2')
			.setDescription('Commander 2')
			.setRequired(false)
			.setAutocomplete(true),
	)
	.addUserOption((option) =>
		option.setName('player3').setDescription('Player 3 (Discord user)').setRequired(false),
	)
	.addStringOption((option) =>
		option.setName('guest3').setDescription('Player 3 (Guest name)').setRequired(false),
	)
	.addStringOption((option) =>
		option
			.setName('commander3')
			.setDescription('Commander 3')
			.setRequired(false)
			.setAutocomplete(true),
	)
	.addUserOption((option) =>
		option.setName('player4').setDescription('Player 4 (Discord user)').setRequired(false),
	)
	.addStringOption((option) =>
		option.setName('guest4').setDescription('Player 4 (Guest name)').setRequired(false),
	)
	.addStringOption((option) =>
		option
			.setName('commander4')
			.setDescription('Commander 4')
			.setRequired(false)
			.setAutocomplete(true),
	)
	.addUserOption((option) =>
		option.setName('player5').setDescription('Player 5 (Discord user)').setRequired(false),
	)
	.addStringOption((option) =>
		option.setName('guest5').setDescription('Player 5 (Guest name)').setRequired(false),
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
	// Validate that at least one player option is provided for each position
	const playerOptions = [];
	for (let i = 1; i <= 5; i++) {
		const discordUser = interaction.options.getUser(`player${i}`);
		const guestName = interaction.options.getString(`guest${i}`);
		const commander = interaction.options.getString(`commander${i}`);

		// Check if either Discord user or guest name is provided
		if (!discordUser && !guestName) {
			await interaction.reply({
				content: `❌ You must provide either a Discord user or guest name for Player ${i}.`,
				flags: [MessageFlags.Ephemeral],
			});
			return;
		}

		// Check that not both are provided
		if (discordUser && guestName) {
			await interaction.reply({
				content: `❌ You cannot provide both a Discord user and guest name for Player ${i}. Choose one or the other.`,
				flags: [MessageFlags.Ephemeral],
			});
			return;
		}

		if (!commander) {
			await interaction.reply({
				content: `❌ You must provide a commander for Player ${i}.`,
				flags: [MessageFlags.Ephemeral],
			});
			return;
		}

		playerOptions.push({
			position: i,
			discordUser,
			guestName,
			commander,
		});
	}

	// Validate that we have at least 2 players
	if (playerOptions.length < 2) {
		await interaction.reply({
			content: '❌ You must provide at least 2 players to register a game.',
			flags: [MessageFlags.Ephemeral],
		});
		return;
	}

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

	for (let i = 0; i < playerOptions.length; i++) {
		const playerOption = playerOptions[i];
		const playerId = playerOption.discordUser ? playerOption.discordUser.id : `guest_${Date.now()}_${i}`;
		const playerName = playerOption.discordUser ? playerOption.discordUser.displayName : playerOption.guestName;
		const commanderData = JSON.parse(playerOption.commander);

		await supabase
			.from('tracker_game_results')
			.insert({
				game_id: game.id,
				player_id: playerId,
				player_name: playerName,
				commander_id: commanderData.id,
				commander_name: commanderData.name,
			});

		components.push(new TextDisplayBuilder().setContent(
			`${playerName} / ${commanderData.name} (position 1 to ${playerOptions.length})`,
		));

		components.push(new ActionRowBuilder().addComponents(
			new StringSelectMenuBuilder()
				.setCustomId(`register-${game.id}-${playerId}-position`)
				.setPlaceholder('Select player\'s position')
				.setOptions(
					Array.from({ length: playerOptions.length }, (_, index) => ({
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
