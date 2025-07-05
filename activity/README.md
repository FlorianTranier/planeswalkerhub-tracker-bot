# Magic: The Gathering Discord Activity Tracker

This activity allows you to track Magic: The Gathering games directly in Discord using the Embedded App SDK. It supports 2-6 players, real-time updates, and links each player to their Discord account.

## Features
- Set max players (2-6)
- Set starting HP
- Real-time updates for all participants
- Each player is linked to their Discord account

## Setup
1. Install dependencies:
   ```sh
   pnpm install
   ```
2. Start the activity server:
   ```sh
   pnpm run activity
   ```
3. Deploy the activity to Discord (see Discord documentation for Embedded Activities).

## Development
- The backend is in `activity/server.js`.
- The frontend is in `activity/client/`.

## Requirements
- Node.js 18+
- Discord server with Activities enabled

## References
- [Discord Embedded App SDK](https://discord.com/developers/docs/activities/using-the-embedded-app-sdk) 