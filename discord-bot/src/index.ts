import { Client, GatewayIntentBits } from "discord.js";
import { registerInteractionCreate } from "./events/interactionCreate.js";

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

registerInteractionCreate(client);

client.once("ready", (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

await client.login(token);
