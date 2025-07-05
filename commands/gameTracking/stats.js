import { SlashCommandBuilder, TextDisplayBuilder, MessageFlags } from 'discord.js';
import { createClient } from '@supabase/supabase-js';

export const data = new SlashCommandBuilder()
	.setName('stats')
	.setDescription('Get stats for this discord server')
	.addSubcommand(subcommand =>
		subcommand
			.setName('player')
			.setDescription('Get player stats for this discord server'),
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName('commander')
			.setDescription('Get commander stats for this discord server'),
	);

export const execute = async (interaction) => {
	const supabase = createClient(
		process.env.SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const { data: games } = await supabase.from('tracker_game').select('*').eq('guild_id', interaction.guild.id);

	if (!games || games.length === 0) {
		const noDataComponent = new TextDisplayBuilder()
			.setContent('📊 **No Game Data Found**\n\nNo games have been tracked in this server yet. Start playing and use `/register` to track your games!');

		await interaction.reply({
			components: [noDataComponent],
			flags: [MessageFlags.IsComponentsV2],
		});
		return;
	}

	const { data: results } = await supabase.from('tracker_game_results').select('*').in('game_id', games.map((game) => game.id));

	if (!results || results.length === 0) {
		const noResultsComponent = new TextDisplayBuilder()
			.setContent('📊 **No Results Found**\n\nNo game results have been recorded yet. Make sure to properly register your games!');

		await interaction.reply({
			components: [noResultsComponent],
			flags: [MessageFlags.IsComponentsV2],
		});
		return;
	}

	// Group results by game to determine player count for each game
	const gamePlayerCounts = {};
	results.forEach(result => {
		if (!gamePlayerCounts[result.game_id]) {
			gamePlayerCounts[result.game_id] = 0;
		}
		gamePlayerCounts[result.game_id]++;
	});

	// Add player count to each result
	const resultsWithPlayerCount = results.map(result => ({
		...result,
		player_count: gamePlayerCounts[result.game_id],
	}));

	const subcommand = interaction.options.getSubcommand();

	if (subcommand === 'player') {
		const playerStats = resultsWithPlayerCount.reduce((acc, result) => {
			if (!acc[result.player_id]) {
				acc[result.player_id] = {
					name: result.player_name,
					games: 0,
					wins: 0,
					positions: [],
					positions3p: [],
					positions4p: [],
					positions5p: [],
				};
			}

			acc[result.player_id].games++;
			acc[result.player_id].positions.push(result.player_position);

			// Add position to appropriate player count array
			if (result.player_count === 3) {
				acc[result.player_id].positions3p.push(result.player_position);
			}
			else if (result.player_count === 4) {
				acc[result.player_id].positions4p.push(result.player_position);
			}
			else if (result.player_count === 5) {
				acc[result.player_id].positions5p.push(result.player_position);
			}

			if (result.player_position === 1) {
				acc[result.player_id].wins++;
			}

			return acc;
		}, {});

		// Convert to array and sort by win rate, then by games played
		const sortedPlayers = Object.values(playerStats)
			.map(player => {
				const avgPosition = player.positions.reduce((a, b) => a + b, 0) / player.positions.length;
				const winRate = (player.wins / player.games) * 100;

				// Calculate average positions for different player counts
				const avgPosition3p = player.positions3p.length > 0
					? Math.round((player.positions3p.reduce((a, b) => a + b, 0) / player.positions3p.length) * 100) / 100
					: null;
				const avgPosition4p = player.positions4p.length > 0
					? Math.round((player.positions4p.reduce((a, b) => a + b, 0) / player.positions4p.length) * 100) / 100
					: null;
				const avgPosition5p = player.positions5p.length > 0
					? Math.round((player.positions5p.reduce((a, b) => a + b, 0) / player.positions5p.length) * 100) / 100
					: null;

				return {
					...player,
					avgPosition: Math.round(avgPosition * 100) / 100,
					winRate: Math.round(winRate * 100) / 100,
					avgPosition3p,
					avgPosition4p,
					avgPosition5p,
					games3p: player.positions3p.length,
					games4p: player.positions4p.length,
					games5p: player.positions5p.length,
				};
			})
			.sort((a, b) => {
				// Sort by win rate first, then by games played
				if (Math.abs(a.winRate - b.winRate) > 0.1) {
					return b.winRate - a.winRate;
				}
				return b.games - a.games;
			});

		// Create components for the stats display
		const components = [];

		// Header component
		const headerComponent = new TextDisplayBuilder()
			.setContent(`🏆 **Player Statistics**\nShowing stats for **${sortedPlayers.length}** players across **${games.length}** games`);

		components.push(headerComponent);

		// Player stats components
		sortedPlayers.forEach((player, index) => {
			const rank = index + 1;
			const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank.toString().padStart(2)}.`;

			const winRateColor = player.winRate >= 25 ? '🟢' : player.winRate >= 15 ? '🟡' : '🔴';

			// Build position stats string
			let positionStats = '';
			if (player.avgPosition3p !== null) {
				const color3p = player.avgPosition3p <= 2.0 ? '🟢' : player.avgPosition3p <= 2.5 ? '🟡' : '🔴';
				positionStats += `3p: ${color3p} ${player.avgPosition3p} (${player.games3p})\n`;
			}
			if (player.avgPosition4p !== null) {
				const color4p = player.avgPosition4p <= 2.5 ? '🟢' : player.avgPosition4p <= 3.0 ? '🟡' : '🔴';
				positionStats += `4p: ${color4p} ${player.avgPosition4p} (${player.games4p})\n`;
			}
			if (player.avgPosition5p !== null) {
				const color5p = player.avgPosition5p <= 3.0 ? '🟢' : player.avgPosition5p <= 3.5 ? '🟡' : '🔴';
				positionStats += `5p: ${color5p} ${player.avgPosition5p} (${player.games5p})\n`;
			}

			const playerComponent = new TextDisplayBuilder()
				.setContent(`${rankEmoji} **${player.name}**\n`);

			components.push(playerComponent);

			const statsComponent = new TextDisplayBuilder()
				.setContent(`   🎮 Games: ${player.games.toString().padStart(2)} • 🏆 Wins: ${player.wins.toString().padStart(2)} • ${winRateColor} Win Rate: ${player.winRate.toString().padStart(5)}%\n` +
					`📍 Avg Positions:\n${positionStats}`);

			components.push(statsComponent);
		});

		// Summary component
		const totalGames = games.length;
		const totalPlayers = sortedPlayers.length;

		const summaryComponent = new TextDisplayBuilder()
			.setContent(`📈 **Server Summary**\n🎮 **${totalGames}** total games • 👥 **${totalPlayers}** players`);

		components.push(summaryComponent);

		await interaction.reply({
			components: components,
			flags: [MessageFlags.IsComponentsV2],
		});
	}
	else if (subcommand === 'commander') {
		const commanderStats = resultsWithPlayerCount.reduce((acc, result) => {
			const key = `${result.player_id}-${result.commander_id}`;
			if (!acc[key]) {
				acc[key] = {
					name: result.player_name,
					commander: result.commander_name,
					games: 0,
					wins: 0,
					positions: [],
					positions3p: [],
					positions4p: [],
					positions5p: [],
				};
			}

			acc[key].games++;
			acc[key].positions.push(result.player_position);

			// Add position to appropriate player count array
			if (result.player_count === 3) {
				acc[key].positions3p.push(result.player_position);
			}
			else if (result.player_count === 4) {
				acc[key].positions4p.push(result.player_position);
			}
			else if (result.player_count === 5) {
				acc[key].positions5p.push(result.player_position);
			}

			if (result.player_position === 1) {
				acc[key].wins++;
			}

			return acc;
		}, {});

		// Convert to array and sort by win rate, then by games played
		const sortedCommanders = Object.values(commanderStats)
			.map(stat => {
				const avgPosition = stat.positions.reduce((a, b) => a + b, 0) / stat.positions.length;
				const winRate = (stat.wins / stat.games) * 100;

				// Calculate average positions for different player counts
				const avgPosition3p = stat.positions3p.length > 0
					? Math.round((stat.positions3p.reduce((a, b) => a + b, 0) / stat.positions3p.length) * 100) / 100
					: null;
				const avgPosition4p = stat.positions4p.length > 0
					? Math.round((stat.positions4p.reduce((a, b) => a + b, 0) / stat.positions4p.length) * 100) / 100
					: null;
				const avgPosition5p = stat.positions5p.length > 0
					? Math.round((stat.positions5p.reduce((a, b) => a + b, 0) / stat.positions5p.length) * 100) / 100
					: null;

				return {
					...stat,
					avgPosition: Math.round(avgPosition * 100) / 100,
					winRate: Math.round(winRate * 100) / 100,
					avgPosition3p,
					avgPosition4p,
					avgPosition5p,
					games3p: stat.positions3p.length,
					games4p: stat.positions4p.length,
					games5p: stat.positions5p.length,
				};
			})
			.sort((a, b) => {
				// Sort by win rate first, then by games played
				if (Math.abs(a.winRate - b.winRate) > 0.1) {
					return b.winRate - a.winRate;
				}
				return b.games - a.games;
			});

		// Create components for the stats display
		const components = [];

		// Header component
		const headerComponent = new TextDisplayBuilder()
			.setContent(`⚔️ **Commander Statistics**\nShowing stats for **${sortedCommanders.length}** commander combinations across **${games.length}** games`);

		components.push(headerComponent);

		// Commander stats components
		sortedCommanders.forEach((stat, index) => {
			const rank = index + 1;
			const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank.toString().padStart(2)}.`;

			const winRateColor = stat.winRate >= 25 ? '🟢' : stat.winRate >= 15 ? '🟡' : '🔴';

			// Build position stats string
			let positionStats = '';
			if (stat.avgPosition3p !== null) {
				const color3p = stat.avgPosition3p <= 2.0 ? '🟢' : stat.avgPosition3p <= 2.5 ? '🟡' : '🔴';
				positionStats += `3p: ${color3p} ${stat.avgPosition3p} (${stat.games3p})\n`;
			}
			if (stat.avgPosition4p !== null) {
				const color4p = stat.avgPosition4p <= 2.5 ? '🟢' : stat.avgPosition4p <= 3.0 ? '🟡' : '🔴';
				positionStats += `4p: ${color4p} ${stat.avgPosition4p} (${stat.games4p})\n`;
			}
			if (stat.avgPosition5p !== null) {
				const color5p = stat.avgPosition5p <= 3.0 ? '🟢' : stat.avgPosition5p <= 3.5 ? '🟡' : '🔴';
				positionStats += `5p: ${color5p} ${stat.avgPosition5p} (${stat.games5p})\n`;
			}

			const commanderComponent = new TextDisplayBuilder()
				.setContent(`${rankEmoji} **${stat.name}** + *${stat.commander}*\n`);

			const statsComponent = new TextDisplayBuilder()
				.setContent(`   🎮 Games: ${stat.games.toString().padStart(2)} • 🏆 Wins: ${stat.wins.toString().padStart(2)} • ${winRateColor} Win Rate: ${stat.winRate.toString().padStart(5)}%\n` +
					`📍 Avg Positions:\n${positionStats}`);

			components.push(commanderComponent);
			components.push(statsComponent);
		});

		// Summary component
		const totalGames = games.length;
		const totalCombinations = sortedCommanders.length;

		const summaryComponent = new TextDisplayBuilder()
			.setContent(`📈 **Server Summary**\n🎮 **${totalGames}** total games • ⚔️ **${totalCombinations}** commander combinations`);

		components.push(summaryComponent);

		await interaction.reply({
			components: components,
			flags: [MessageFlags.IsComponentsV2],
		});
	}
};