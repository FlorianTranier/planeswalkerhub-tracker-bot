import {
	SlashCommandBuilder,
	TextDisplayBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
} from 'discord.js';
import { createClient } from '@supabase/supabase-js';

const GAMES_PER_PAGE = 5;

export const data = new SlashCommandBuilder()
	.setName('history')
	.setDescription('View recent game history with pagination')
	.addIntegerOption((option) =>
		option
			.setName('page')
			.setDescription('Page number to view (default: 1)')
			.setRequired(false)
			.setMinValue(1),
	)
	.addUserOption((option) =>
		option
			.setName('player')
			.setDescription('Filter games by specific player')
			.setRequired(false),
	);

export const execute = async (interaction) => {
	const supabase = createClient(
		process.env.SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const page = interaction.options.getInteger('page') || 1;
	const playerFilter = interaction.options.getUser('player');

	// Calculate offset for pagination
	const offset = (page - 1) * GAMES_PER_PAGE;

	// Build the query for games
	let gamesQuery = supabase
		.from('tracker_game')
		.select('*')
		.eq('guild_id', interaction.guild.id)
		.order('created_at', { ascending: false })
		.range(offset, offset + GAMES_PER_PAGE - 1);

	// If player filter is specified, we need to join with results
	if (playerFilter) {
		gamesQuery = supabase
			.from('tracker_game')
			.select(`
				*,
				tracker_game_results!inner(*)
			`)
			.eq('guild_id', interaction.guild.id)
			.eq('tracker_game_results.player_id', playerFilter.id)
			.order('created_at', { ascending: false })
			.range(offset, offset + GAMES_PER_PAGE - 1);
	}

	const { data: games, error: gamesError } = await gamesQuery;

	if (gamesError) {
		console.error('Error fetching games:', gamesError);
		await interaction.reply({
			content: '❌ An error occurred while fetching game history.',
			flags: [MessageFlags.Ephemeral],
		});
		return;
	}

	if (!games || games.length === 0) {
		const noGamesMessage = playerFilter
			? `📚 **No Games Found**\n\nNo games found for **${playerFilter.displayName}** on page ${page}.`
			: '📚 **No Games Found**\n\nNo games have been tracked in this server yet. Start playing and use `/register` to track your games!';

		await interaction.reply({
			components: [new TextDisplayBuilder().setContent(noGamesMessage)],
			flags: [MessageFlags.IsComponentsV2],
		});
		return;
	}

	// Get all game IDs to fetch results
	const gameIds = games.map(game => game.id);

	// Fetch all results for these games
	const { data: allResults, error: resultsError } = await supabase
		.from('tracker_game_results')
		.select('*')
		.in('game_id', gameIds)
		.order('player_position', { ascending: true });

	if (resultsError) {
		console.error('Error fetching results:', resultsError);
		await interaction.reply({
			content: '❌ An error occurred while fetching game results.',
			flags: [MessageFlags.Ephemeral],
		});
		return;
	}

	// Group results by game ID
	const resultsByGame = {};
	allResults.forEach(result => {
		if (!resultsByGame[result.game_id]) {
			resultsByGame[result.game_id] = [];
		}
		resultsByGame[result.game_id].push(result);
	});

	// Get total count for pagination
	let totalGamesQuery = supabase
		.from('tracker_game')
		.select('id', { count: 'exact' })
		.eq('guild_id', interaction.guild.id);

	if (playerFilter) {
		totalGamesQuery = supabase
			.from('tracker_game')
			.select(`
				id,
				tracker_game_results!inner(*)
			`, { count: 'exact' })
			.eq('guild_id', interaction.guild.id)
			.eq('tracker_game_results.player_id', playerFilter.id);
	}

	const { count: totalGames } = await totalGamesQuery;
	const totalPages = Math.ceil(totalGames / GAMES_PER_PAGE);

	// Build the display components
	const components = [];

	// Header
	const headerText = playerFilter
		? `📚 **Game History - ${playerFilter.displayName}**\nPage ${page} of ${totalPages} • ${totalGames} total games`
		: `📚 **Game History**\nPage ${page} of ${totalPages} • ${totalGames} total games`;

	components.push(new TextDisplayBuilder().setContent(headerText));

	// Game entries
	games.forEach((game, index) => {
		const results = resultsByGame[game.id] || [];
		const playerCount = results.length;

		// Format the date
		const gameDate = new Date(game.created_at);
		const dateString = gameDate.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});

		// Build game header
		const gameHeader = new TextDisplayBuilder()
			.setContent(`🎮 **Game #${game.id}** • ${dateString} • ${playerCount} players`);

		components.push(gameHeader);

		// Build player results
		const sortedResults = results.sort((a, b) => a.player_position - b.player_position);
		let resultsText = '';

		sortedResults.forEach((result) => {
			const positionEmoji = result.player_position === 1 ? '🥇' :
				result.player_position === 2 ? '🥈' :
					result.player_position === 3 ? '🥉' : '🎮';

			const commanderText = result.commander_name ? ` (${result.commander_name})` : '';
			resultsText += `${positionEmoji} **${result.player_name}**${commanderText}\n`;
		});

		const resultsComponent = new TextDisplayBuilder()
			.setContent(resultsText);

		components.push(resultsComponent);

		// Add separator if not the last game
		if (index < games.length - 1) {
			components.push(new TextDisplayBuilder().setContent('─'.repeat(40)));
		}
	});

	// Pagination buttons
	const buttons = [];

	if (page > 1) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId(`history-${page - 1}-${playerFilter?.id || 'all'}`)
				.setLabel('◀️ Previous')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	if (page < totalPages) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId(`history-${page + 1}-${playerFilter?.id || 'all'}`)
				.setLabel('Next ▶️')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	// Add refresh button
	buttons.push(
		new ButtonBuilder()
			.setCustomId(`history-${page}-${playerFilter?.id || 'all'}`)
			.setLabel('🔄 Refresh')
			.setStyle(ButtonStyle.Primary),
	);

	if (buttons.length > 0) {
		const buttonRow = new ActionRowBuilder().addComponents(buttons);
		components.push(buttonRow);
	}

	await interaction.reply({
		components: components,
		flags: [MessageFlags.IsComponentsV2],
	});
};

/**
 * Handle button interactions for pagination
 * @param {ButtonInteraction} interaction
 */
export const buttonInteraction = async (interaction) => {
	await interaction.deferUpdate();
	if (!interaction.customId.startsWith('history-')) {
		return;
	}

	const [, page, playerId] = interaction.customId.split('-');
	const pageNum = parseInt(page);
	const playerFilter = playerId === 'all' ? null : playerId;

	const supabase = createClient(
		process.env.SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	// Calculate offset for pagination
	const offset = (pageNum - 1) * GAMES_PER_PAGE;

	// Build the query for games
	let gamesQuery = supabase
		.from('tracker_game')
		.select('*')
		.eq('guild_id', interaction.guild.id)
		.order('created_at', { ascending: false })
		.range(offset, offset + GAMES_PER_PAGE - 1);

	// If player filter is specified, we need to join with results
	if (playerFilter) {
		gamesQuery = supabase
			.from('tracker_game')
			.select(`
				*,
				tracker_game_results!inner(*)
			`)
			.eq('guild_id', interaction.guild.id)
			.eq('tracker_game_results.player_id', playerFilter)
			.order('created_at', { ascending: false })
			.range(offset, offset + GAMES_PER_PAGE - 1);
	}

	const { data: games, error: gamesError } = await gamesQuery;

	if (gamesError) {
		console.error('Error fetching games:', gamesError);
		await interaction.editReply({
			content: '❌ An error occurred while fetching game history.',
			components: [],
		});
		return;
	}

	if (!games || games.length === 0) {
		const noGamesMessage = playerFilter
			? `📚 **No Games Found**\n\nNo games found for this player on page ${pageNum}.`
			: '📚 **No Games Found**\n\nNo games have been tracked in this server yet. Start playing and use `/register` to track your games!';

		await interaction.editReply({
			components: [new TextDisplayBuilder().setContent(noGamesMessage)],
		});
		return;
	}

	// Get all game IDs to fetch results
	const gameIds = games.map(game => game.id);

	// Fetch all results for these games
	const { data: allResults, error: resultsError } = await supabase
		.from('tracker_game_results')
		.select('*')
		.in('game_id', gameIds)
		.order('player_position', { ascending: true });

	if (resultsError) {
		console.error('Error fetching results:', resultsError);
		await interaction.editReply({
			content: '❌ An error occurred while fetching game results.',
			components: [],
		});
		return;
	}

	// Group results by game ID
	const resultsByGame = {};
	allResults.forEach(result => {
		if (!resultsByGame[result.game_id]) {
			resultsByGame[result.game_id] = [];
		}
		resultsByGame[result.game_id].push(result);
	});

	// Get total count for pagination
	let totalGamesQuery = supabase
		.from('tracker_game')
		.select('id', { count: 'exact' })
		.eq('guild_id', interaction.guild.id);

	if (playerFilter) {
		totalGamesQuery = supabase
			.from('tracker_game')
			.select(`
				id,
				tracker_game_results!inner(*)
			`, { count: 'exact' })
			.eq('guild_id', interaction.guild.id)
			.eq('tracker_game_results.player_id', playerFilter);
	}

	const { count: totalGames } = await totalGamesQuery;
	const totalPages = Math.ceil(totalGames / GAMES_PER_PAGE);

	// Build the display components
	const components = [];

	// Header
	const headerText = playerFilter
		? `📚 **Game History**\nPage ${pageNum} of ${totalPages} • ${totalGames} total games`
		: `📚 **Game History**\nPage ${pageNum} of ${totalPages} • ${totalGames} total games`;

	components.push(new TextDisplayBuilder().setContent(headerText));

	// Game entries
	games.forEach((game, index) => {
		const results = resultsByGame[game.id] || [];
		if (!results || results.length === 0) {
			const noResultsMessage = `📚 **No Results Found**\n\nNo results found for game #${game.id}.`;
			components.push(new TextDisplayBuilder().setContent(noResultsMessage));
			return;
		}

		const playerCount = results.length;

		// Format the date
		const gameDate = new Date(game.created_at);
		const dateString = gameDate.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});

		// Build game header
		const gameHeader = new TextDisplayBuilder()
			.setContent(`🎮 **Game #${game.id}** • ${dateString} • ${playerCount} players`);

		components.push(gameHeader);

		// Build player results
		const sortedResults = results.sort((a, b) => a.player_position - b.player_position);
		let resultsText = '';

		sortedResults.forEach((result) => {
			const positionEmoji = result.player_position === 1 ? '🥇' :
				result.player_position === 2 ? '🥈' :
					result.player_position === 3 ? '🥉' : '🎮';

			const commanderText = result.commander_name ? ` (${result.commander_name})` : '';
			resultsText += `${positionEmoji} **${result.player_name}**${commanderText}\n`;
		});

		const resultsComponent = new TextDisplayBuilder()
			.setContent(resultsText);

		components.push(resultsComponent);

		// Add separator if not the last game
		if (index < games.length - 1) {
			components.push(new TextDisplayBuilder().setContent('─'.repeat(40)));
		}
	},
	);

	// Pagination buttons
	const buttons = [];

	if (pageNum > 1) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId(`history-${pageNum - 1}-${playerFilter || 'all'}`)
				.setLabel('◀️ Previous')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	if (pageNum < totalPages) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId(`history-${pageNum + 1}-${playerFilter || 'all'}`)
				.setLabel('Next ▶️')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	// Add refresh button
	buttons.push(
		new ButtonBuilder()
			.setCustomId(`history-${pageNum}-${playerFilter || 'all'}`)
			.setLabel('🔄 Refresh')
			.setStyle(ButtonStyle.Primary),
	);

	if (buttons.length > 0) {
		const buttonRow = new ActionRowBuilder().addComponents(buttons);
		components.push(buttonRow);
	}

	await interaction.editReply({
		components: components,
	});
};