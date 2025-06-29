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

	const { data: results } = (await supabase.from('tracker_game_results').select('*').in('game_id', games.map((game) => game.id)));

	const subcommand = interaction.options.getSubcommand();

	if (subcommand === 'player') {
		const playerStats = results.reduce((acc, result) => {
			if (!acc[result.player_id]) {
				acc[result.player_id] = {
					name: result.player_name,
					games: 0,
					wins: 0,
					positions: [],
				};
			}

			acc[result.player_id].games++;
			acc[result.player_id].positions.push(result.player_position);
			if (result.player_position === 1) {
				acc[result.player_id].wins++;
			}

			return acc;
		}, {});

		await interaction.reply({
			components: [
				new TextDisplayBuilder().setContent('📊 Player Stats 📊'),
				...Object.values(playerStats).map(player => {
					const avgPosition = player.positions.reduce((a, b) => a + b, 0) / player.positions.length;
					const winRate = Math.round((player.wins / player.games) * 100);
					return new TextDisplayBuilder().setContent(
						`**${player.name}**\n` +
						`🎮 Games: ${player.games}\n` +
						`🏆 Wins: ${player.wins} (${winRate}%)\n` +
						`📍 Avg Position: ${Math.round(avgPosition * 100) / 100}`,
					);
				}),
			],
			flags: [MessageFlags.IsComponentsV2],
		});
	}
	else if (subcommand === 'commander') {
		const commanderStats = results.reduce((acc, result) => {
			const key = `${result.player_id}-${result.commander_id}`;
			if (!acc[key]) {
				acc[key] = {
					name: result.player_name,
					commander: result.commander_name,
					games: 0,
					wins: 0,
					positions: [],
				};
			}

			acc[key].games++;
			acc[key].positions.push(result.player_position);
			if (result.player_position === 1) {
				acc[key].wins++;
			}

			return acc;
		}, {});

		await interaction.reply({
			components: [
				new TextDisplayBuilder().setContent('📊 Commander Stats 📊'),
				...Object.values(commanderStats).map(stat => {
					const avgPosition = stat.positions.reduce((a, b) => a + b, 0) / stat.positions.length;
					const winRate = Math.round((stat.wins / stat.games) * 100);
					return new TextDisplayBuilder().setContent(
						`**${stat.name}** with __${stat.commander}__\n` +
						`🎮 Games: ${stat.games}\n` +
						`🏆 Wins: ${stat.wins} (${winRate}%)\n` +
						`📍 Avg Position: ${Math.round(avgPosition * 100) / 100}`,
					);
				}),
			],
			flags: [MessageFlags.IsComponentsV2],
		});
	}
};