import {
	SlashCommandBuilder,
	TextDisplayBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	MessageFlags,
} from 'discord.js';
import { createClient } from '@supabase/supabase-js';

const GAMES_PER_PAGE = 3;

export const data = new SlashCommandBuilder()
	.setName('h2h')
	.setDescription('View head-to-head matchup history between two players')
	.addUserOption((option) =>
		option
			.setName('player1')
			.setDescription('First player')
			.setRequired(true),
	)
	.addUserOption((option) =>
		option
			.setName('player2')
			.setDescription('Second player')
			.setRequired(true),
	)
	.addIntegerOption((option) =>
		option
			.setName('page')
			.setDescription('Page number to view (default: 1)')
			.setRequired(false)
			.setMinValue(1),
	);

export const execute = async (interaction) => {
	const supabase = createClient(
		process.env.SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const player1 = interaction.options.getUser('player1');
	const player2 = interaction.options.getUser('player2');
	const page = interaction.options.getInteger('page') || 1;

	// Prevent comparing a player with themselves
	if (player1.id === player2.id) {
		await interaction.reply({
			content: '❌ You cannot compare a player with themselves!',
			flags: [MessageFlags.Ephemeral],
		});
		return;
	}

	// Get all games where either player participated
	const { data: games, error: gamesError } = await supabase
		.from('tracker_game')
		.select('*')
		.eq('guild_id', interaction.guild.id);

	if (gamesError) {
		console.error('Error fetching games:', gamesError);
		await interaction.reply({
			content: '❌ An error occurred while fetching matchup data.',
			flags: [MessageFlags.Ephemeral],
		});
		return;
	}

	if (!games || games.length === 0) {
		await interaction.reply({
			components: [
				new TextDisplayBuilder()
					.setContent('📊 **No Games Found**\n\nNo games have been tracked in this server yet.'),
			],
			flags: [MessageFlags.IsComponentsV2],
		});
		return;
	}

	// Get all results for these games
	const gameIds = games.map(game => game.id);
	const { data: allResults, error: resultsError } = await supabase
		.from('tracker_game_results')
		.select('*')
		.in('game_id', gameIds);

	if (resultsError) {
		console.error('Error fetching results:', resultsError);
		await interaction.reply({
			content: '❌ An error occurred while fetching game results.',
			flags: [MessageFlags.Ephemeral],
		});
		return;
	}

	// Filter games where both players actually participated
	const gamesWithBothPlayers = [];
	const resultsByGame = {};

	// Group results by game
	allResults.forEach(result => {
		if (!resultsByGame[result.game_id]) {
			resultsByGame[result.game_id] = [];
		}
		resultsByGame[result.game_id].push(result);
	});

	// Find games where both players participated
	games.forEach(game => {
		const gameResults = resultsByGame[game.id] || [];
		const player1InGame = gameResults.some(result => result.player_id === player1.id);
		const player2InGame = gameResults.some(result => result.player_id === player2.id);

		if (player1InGame && player2InGame) {
			gamesWithBothPlayers.push({
				game,
				results: gameResults,
			});
		}
	});

	if (gamesWithBothPlayers.length === 0) {
		await interaction.reply({
			components: [
				new TextDisplayBuilder()
					.setContent(`📊 **No Direct Matchups Found**\n\nNo games found where both **${player1.displayName}** and **${player2.displayName}** participated together.`),
			],
			flags: [MessageFlags.IsComponentsV2],
		});
		return;
	}

	// Calculate head-to-head statistics for all games
	let player1Wins = 0;
	let player2Wins = 0;
	let player1TotalGames = 0;
	let player2TotalGames = 0;
	let player1AvgPosition = 0;
	let player2AvgPosition = 0;

	const allMatchupDetails = [];

	gamesWithBothPlayers.forEach(({ game, results }) => {
		const player1Result = results.find(result => result.player_id === player1.id);
		const player2Result = results.find(result => result.player_id === player2.id);

		if (player1Result && player2Result) {
			// Track wins
			if (player1Result.player_position === 1) {
				player1Wins++;
			}
			if (player2Result.player_position === 1) {
				player2Wins++;
			}

			// Track total games and positions
			player1TotalGames++;
			player2TotalGames++;
			player1AvgPosition += player1Result.player_position;
			player2AvgPosition += player2Result.player_position;

			// Add to matchup details
			allMatchupDetails.push({
				gameId: game.id,
				date: game.created_at,
				player1Position: player1Result.player_position,
				player2Position: player2Result.player_position,
				player1Commander: player1Result.commander_name,
				player2Commander: player2Result.commander_name,
				totalPlayers: results.length,
			});
		}
	});

	// Calculate averages
	player1AvgPosition = player1TotalGames > 0 ? Math.round((player1AvgPosition / player1TotalGames) * 100) / 100 : 0;
	player2AvgPosition = player2TotalGames > 0 ? Math.round((player2AvgPosition / player2TotalGames) * 100) / 100 : 0;

	// Calculate win rates
	const player1WinRate = player1TotalGames > 0 ? Math.round((player1Wins / player1TotalGames) * 100) : 0;
	const player2WinRate = player2TotalGames > 0 ? Math.round((player2Wins / player2TotalGames) * 100) : 0;

	// Sort by date (newest first) and apply pagination
	const sortedDetails = allMatchupDetails.sort((a, b) => new Date(b.date) - new Date(a.date));
	const totalPages = Math.ceil(sortedDetails.length / GAMES_PER_PAGE);
	const startIndex = (page - 1) * GAMES_PER_PAGE;
	const endIndex = startIndex + GAMES_PER_PAGE;
	const pageDetails = sortedDetails.slice(startIndex, endIndex);

	// Build the display components
	const components = [];

	// Header
	const headerComponent = new TextDisplayBuilder()
		.setContent(`⚔️ **Head-to-Head: ${player1.displayName} vs ${player2.displayName}**\n${gamesWithBothPlayers.length} games played together • Page ${page} of ${totalPages}`);

	components.push(headerComponent);

	// Overall statistics
	const statsComponent = new TextDisplayBuilder()
		.setContent('📊 **Overall Statistics**\n\n' +
			`**${player1.displayName}:**\n` +
			`🏆 Wins: ${player1Wins}/${player1TotalGames} (${player1WinRate}%)\n` +
			`📍 Avg Position: ${player1AvgPosition}\n\n` +
			`**${player2.displayName}:**\n` +
			`🏆 Wins: ${player2Wins}/${player2TotalGames} (${player2WinRate}%)\n` +
			`📍 Avg Position: ${player2AvgPosition}`);

	components.push(statsComponent);

	// Game-by-game breakdown
	if (pageDetails.length > 0) {
		const detailsHeader = new TextDisplayBuilder()
			.setContent('🎮 **Game-by-Game Breakdown**');

		components.push(detailsHeader);

		pageDetails.forEach((detail, index) => {
			const gameDate = new Date(detail.date);
			const dateString = gameDate.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});

			// Determine winner
			let winnerText = '';
			if (detail.player1Position === 1) {
				winnerText = `🥇 **${player1.displayName}** won`;
			}
			else if (detail.player2Position === 1) {
				winnerText = `🥇 **${player2.displayName}** won`;
			}
			else {
				winnerText = '🎮 Neither player won';
			}

			const gameComponent = new TextDisplayBuilder()
				.setContent(`**Game #${detail.gameId}** • ${dateString} • ${detail.totalPlayers}p\n` +
					`${winnerText}\n` +
					`${player1.displayName}: ${detail.player1Position}${detail.player1Commander ? ` (${detail.player1Commander})` : ''}\n` +
					`${player2.displayName}: ${detail.player2Position}${detail.player2Commander ? ` (${detail.player2Commander})` : ''}`);

			components.push(gameComponent);

			// Add separator if not the last game
			if (index < pageDetails.length - 1) {
				components.push(new TextDisplayBuilder().setContent('─'.repeat(40)));
			}
		});
	}

	// Summary
	const summaryComponent = new TextDisplayBuilder()
		.setContent('📈 **Matchup Summary**\n' +
			`${player1.displayName} has won ${player1Wins} times\n` +
			`${player2.displayName} has won ${player2Wins} times\n` +
			`${gamesWithBothPlayers.length - player1Wins - player2Wins} games won by other players`);

	components.push(summaryComponent);

	// Pagination buttons
	const buttons = [];

	if (page > 1) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId(`h2h-${page - 1}-${player1.id}-${player2.id}`)
				.setLabel('◀️ Previous')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	if (page < totalPages) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId(`h2h-${page + 1}-${player1.id}-${player2.id}`)
				.setLabel('Next ▶️')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	// Add refresh button
	buttons.push(
		new ButtonBuilder()
			.setCustomId(`h2h-${page}-${player1.id}-${player2.id}`)
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
	if (!interaction.customId.startsWith('h2h-')) {
		return;
	}

	await interaction.deferUpdate();

	const [, page, player1Id, player2Id] = interaction.customId.split('-');
	const pageNum = parseInt(page);

	// Create a mock interaction object with the same properties we need
	const mockInteraction = {
		options: {
			getUser: (name) => {
				if (name === 'player1') {
					return { id: player1Id, displayName: 'Player 1' };
				}
				if (name === 'player2') {
					return { id: player2Id, displayName: 'Player 2' };
				}
				return null;
			},
			getInteger: () => pageNum,
		},
		guild: interaction.guild,
		reply: interaction.editReply.bind(interaction),
	};

	await execute(mockInteraction);
};