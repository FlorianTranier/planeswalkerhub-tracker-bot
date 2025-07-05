import { DiscordSDK } from 'https://cdn.jsdelivr.net/npm/@discord/embedded-app-sdk@2.0.0/+esm';

const socket = io();
const root = document.getElementById('root');

let user = null;
let game = null;

console.log('setting up discord sdk');
const discordSDK = new DiscordSDK('1309999114309734502');
console.log('discord sdk set up');

// Discord Embedded SDK: get user info
discordSDK.ready().then(() => {
	discordSDK.commands.getCurrentUser().then((discordUser) => {
		user = {
			id: discordUser.id,
			username: discordUser.username,
		};
		render();
	});
});

socket.on('update', (g) => {
	game = g;
	render();
});

function joinGame() {
	if (user) socket.emit('join', user);
}
function leaveGame() {
	if (user) socket.emit('leave', { id: user.id });
}
function setHP(id, hp) {
	socket.emit('setHP', { id, hp });
}
function setConfig() {
	const maxPlayers = parseInt(document.getElementById('maxPlayers').value, 10);
	const startingHP = parseInt(document.getElementById('startingHP').value, 10);
	socket.emit('config', { maxPlayers, startingHP });
}

function render() {
	if (!user) {
		root.innerHTML = '<p>Loading user info...</p>';
		return;
	}
	let html = '';
	html += '<h2>Magic: The Gathering Tracker</h2>';
	if (game) {
		html += `<div style="margin-bottom:16px;">
      <label>Max Players: <select id="maxPlayers">${[2, 3, 4, 5, 6].map(n => `<option${game.maxPlayers === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label style="margin-left:12px;">Starting HP: <input id="startingHP" type="number" min="1" value="${game.startingHP}"></label>
      <button onclick="(${setConfig.toString()})()">Set</button>
    </div>`;
		html += '<div>';
		for (const p of game.players) {
			html += `<div class="player">
        <span class="username">${p.username}${p.id === user.id ? ' (You)' : ''}</span>
        <span class="hp">HP: <input type="number" min="0" value="${p.hp}" onchange="(${(e => setHP(p.id, parseInt(e.target.value, 10))).toString()})(event)"></span>
        ${p.id === user.id ? `<button onclick="(${leaveGame.toString()})()">Leave</button>` : ''}
      </div>`;
		}
		html += '</div>';
		if (!game.players.find(p => p.id === user.id) && game.players.length < game.maxPlayers) {
			html += `<button onclick="(${joinGame.toString()})()">Join Game</button>`;
		}
	}
	else {
		html += '<p>Waiting for game state...</p>';
	}
	root.innerHTML = html;
}