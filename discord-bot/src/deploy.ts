/**
 * Run this script once to register (or update) slash commands with Discord.
 *
 * Usage:
 *   pnpm --filter discord-bot run deploy
 *
 * Required environment variables:
 *   DISCORD_BOT_TOKEN      — your bot token
 *   DISCORD_CLIENT_ID      — your application / client ID
 *   DISCORD_GUILD_ID       — (optional) guild ID for instant deployment;
 *                            omit to deploy globally (takes ~1 hour to propagate)
 */

import { REST, Routes } from "discord.js";
import * as planCommand from "./commands/plan.js";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error(
    "DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be set before deploying commands."
  );
  process.exit(1);
}

const commands = [planCommand.data.toJSON()];

const rest = new REST({ version: "10" }).setToken(token);

if (guildId) {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands,
  });
  console.log(`✅ Registered ${commands.length} guild command(s) to guild ${guildId}.`);
} else {
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log(`✅ Registered ${commands.length} global command(s).`);
}
