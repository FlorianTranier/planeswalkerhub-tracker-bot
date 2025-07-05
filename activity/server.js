import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: { origin: '*' },
});

const PORT = process.env.PORT || 3001;

// In-memory game state
// players: { id, username, hp }
const game = {
	maxPlayers: 4,
	startingHP: 20,
	players: [],
};

io.on('connection', (socket) => {
	// Player joins
	socket.on('join', ({ id, username }) => {
		if (game.players.length < game.maxPlayers && !game.players.find((p) => p.id === id)) {
			game.players.push({ id, username, hp: game.startingHP });
			io.emit('update', game);
		}
	});

	// Player leaves
	socket.on('leave', ({ id }) => {
		game.players = game.players.filter((p) => p.id !== id);
		io.emit('update', game);
	});

	// Set HP
	socket.on('setHP', ({ id, hp }) => {
		const player = game.players.find((p) => p.id === id);
		if (player) {
			player.hp = hp;
			io.emit('update', game);
		}
	});

	// Set max players and starting HP (admin only, for demo)
	socket.on('config', ({ maxPlayers, startingHP }) => {
		if (maxPlayers >= 2 && maxPlayers <= 6) game.maxPlayers = maxPlayers;
		if (startingHP > 0) game.startingHP = startingHP;
		// Reset players
		game.players = game.players.map((p) => ({ ...p, hp: game.startingHP }));
		io.emit('update', game);
	});

	// On disconnect
	socket.on('disconnect', () => {
		// Optionally handle player removal
	});
});

app.use(cors());
app.use(express.static('activity/client'));

server.listen(PORT, () => {
	console.log(`Activity server running on port ${PORT}`);
});