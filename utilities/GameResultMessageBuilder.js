import { createClient } from '@supabase/supabase-js';
import { TextDisplayBuilder } from 'discord.js';

const buildGameResultMessage = async (gameId) => {
	const supabase = createClient(
		process.env.SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY,
	);

	const { data: game } = await supabase.from('tracker_games').select('*').eq('id', gameId).single();

	const { data: results } = await supabase.from('tracker_game_results').select('*').eq('game_id', gameId);

	const sortedResults = results.sort((a, b) => a.player_position - b.player_position);

	const components = [];

	components.push(
		new TextDisplayBuilder().setContent('🏆 Game Results 🏆'),
	);

	sortedResults.forEach((result) => {
		const positionEmoji = result.player_position === 1 ? '🥇' : result.player_position === 2 ? '🥈' : result.player_position === 3 ? '🥉' : '🎮';
		const commanderText = result.commander_name ? ` piloting __${result.commander_name}__` : '';

		components.push(
			new TextDisplayBuilder()
				.setContent(`${positionEmoji} ${result.player_position} - **${result.player_name}**${commanderText}`),
		);
	});

	return components;
};

export { buildGameResultMessage };