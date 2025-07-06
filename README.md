# PlaneswalkerHub Tracker Bot 🎮

A powerful Discord bot for tracking Magic: The Gathering Commander games, player statistics, and head-to-head matchups. Built with Discord.js v14 and Supabase for data persistence.

## ✨ Features

### 🎯 Game Tracking
- **Register Games**: Track Commander games with up to 5 players
- **Commander Autocomplete**: Intelligent card search powered by MeiliSearch
- **Flexible Player Input**: Support for both Discord users and guest players

### 📊 Statistics & Analytics
- **Player Statistics**: Win rates, average positions, and performance metrics
- **Commander Statistics**: Track performance by commander
- **Head-to-Head Matchups**: Compare players' performance against each other
- **Game History**: Browse recent games with pagination and filtering

### 🏆 Advanced Features
- **Position-Based Rankings**: 1st, 2nd, 3rd, 4th, 5th place tracking
- **Server-Specific Data**: All data is isolated per Discord server
- **Real-time Updates**: Instant statistics and history updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- A discord app setup with the following permissions:
  - Send Messages
  - Use Slash Commands
  - Read Message History
  - View Channels
  - Manage Messages (for interactive components)
- Supabase account and database
- MeiliSearch instance (for card autocomplete)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/floriantranier/planeswalkerhub-tracker-bot.git
   cd planeswalkerhub-tracker-bot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   MEILI_HOST=your_meilisearch_host
   MEILI_KEY=your_meilisearch_api_key
   ```

4. **Deploy slash commands**
   ```bash
   node deploy-commands.js
   ```

5. **Start the bot**
   ```bash
   # Development
   pnpm start:dev
   
   # Production
   pnpm start
   ```

## 🐳 Docker Deployment

The bot includes Docker support for easy deployment:

```bash
# Build the image
docker build -t planeswalkerhub-tracker-bot .

# Run the container
docker run -d \
  --name tracker-bot \
  --env-file .env \
  planeswalkerhub-tracker-bot
```

## 📋 Commands

### Game Tracking Commands

#### `/register` - Register a new game
Register a Magic: The Gathering Commander game with up to 5 players.

**Options:**
- `commander1-5`: Commander names (with autocomplete)
- `player1-5`: Discord users (optional)
- `guest1-5`: Guest player names (optional)

**Example:**
```
/register commander1:Atraxa, Praetors' Voice player1:@Player1 commander2:Urza, Lord High Artificer player2:@Player2
```

#### `/history` - View game history
Browse recent games with pagination and filtering options.

**Options:**
- `page`: Page number (default: 1)
- `player`: Filter by Discord user (optional)
- `guest`: Filter by guest player name (optional)

**Example:**
```
/history page:2 player:@Player1
```

### Statistics Commands

#### `/stats player` - Player statistics
View comprehensive player performance statistics including:
- Win rates and total games
- Average positions (overall and by player count)
- Performance breakdown for 3p, 4p, and 5p games

#### `/stats commander` - Commander statistics
View commander performance statistics including:
- Win rates by commander
- Most played commanders
- Performance metrics

#### `/h2h` - Head-to-head matchups
Compare two players' performance against each other.

**Options:**
- `player1`: First player (required)
- `player2`: Second player (required)
- `page`: Page number (default: 1)

**Example:**
```
/h2h player1:@Player1 player2:@Player2
```

### Utility Commands

#### `/ping` - Bot health check
Simple ping command to verify the bot is responsive.

## 🗄️ Database Schema

The bot uses Supabase with the following main tables:

### `tracker_game`
- `id`: Primary key
- `guild_id`: Discord server ID
- `guild_name`: Discord server name
- `created_at`: Game timestamp

### `tracker_game_results`
- `id`: Primary key
- `game_id`: Foreign key to tracker_game
- `player_id`: Discord user ID or guest identifier
- `player_name`: Player display name
- `commander_id`: Commander card ID
- `commander_name`: Commander card name
- `player_position`: Final position (1-5)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | ✅ |
| `DISCORD_CLIENT_ID` | Discord application client ID | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ |
| `MEILI_HOST` | MeiliSearch host URL | ✅ |
| `MEILI_KEY` | MeiliSearch API key | ✅ |

### Bot Permissions

The bot requires the following Discord permissions:
- Send Messages
- Use Slash Commands
- Read Message History
- View Channels
- Manage Messages (for interactive components)

## 🏗️ Project Structure

```
planeswalkerhub-tracker-bot/
├── commands/
│   ├── gameTracking/     # Game tracking commands
│   │   ├── register.js   # Game registration
│   │   ├── history.js    # Game history
│   │   ├── h2h.js        # Head-to-head stats
│   │   └── stats.js      # Player/commander stats
│   └── utility/          # Utility commands
│       └── ping.js       # Health check
├── events/               # Discord event handlers
│   └── interactionCreate.js
├── utilities/            # Helper utilities
│   └── GameResultMessageBuilder.js
├── deploy-commands.js    # Slash command deployment
├── index.js             # Bot entry point
├── package.json         # Dependencies and scripts
├── Dockerfile          # Docker configuration
└── README.md           # This file
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- pnpm
- ESLint and Prettier (for code formatting)

### Development Scripts

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start:dev

# Run linting
pnpm lint

# Format code
pnpm format
```

### Code Style

The project uses ESLint and Prettier for code formatting. Configuration files:
- `eslint.config.js` - ESLint configuration
- `.prettierrc` - Prettier configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and formatting
- Add appropriate error handling
- Include comments for complex logic
- Test commands thoroughly before submitting

## 📝 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)** - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ **You can use, modify, and distribute this code** for non-commercial purposes
- ✅ **You must give credit** to the original author and link to this repository
- ❌ **You cannot use this code for commercial purposes** (selling, monetizing, etc.)
- ✅ **You can share your modifications** as long as you follow the same license terms

### Attribution Requirements:
When using this code, you must include:
- A link to this repository: `https://github.com/floriantranier/planeswalkerhub-tracker-bot`
- Credit to the original author
- Indication if you made any changes
- A link to the license: `https://creativecommons.org/licenses/by-nc/4.0/`

For commercial use inquiries, please contact the repository owner.

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API wrapper
- [Supabase](https://supabase.com/) - Backend as a Service
- [MeiliSearch](https://www.meilisearch.com/) - Search engine for card autocomplete
- Magic: The Gathering community for inspiration

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/floriantranier/planeswalkerhub-tracker-bot/issues) page
2. Create a new issue with detailed information
3. Include your Discord server setup and any error messages

## 🔄 Version History

- **v1.1.0** - Current version
  - Enhanced statistics and analytics
  - Improved user interface
  - Better error handling
  - Docker support

---

**Made with ❤️ for the Magic: The Gathering Commander community** 