import { Client, Events, Interaction } from "discord.js";
import * as planCommand from "../commands/plan.js";
import { handlePlanBuyTicket } from "../handlers/ticketHandler.js";

const commands = new Map([["plan", planCommand]]);

export function registerInteractionCreate(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    // ── Slash commands ────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`Error executing /${interaction.commandName}:`, err);
        const msg = { content: "❌ An error occurred. Please try again.", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
      return;
    }

    // ── Button interactions ───────────────────────────────────────────────
    if (interaction.isButton()) {
      // Handle plan buy buttons
      if (interaction.customId.startsWith("plan_buy:")) {
        try {
          await handlePlanBuyTicket(interaction);
        } catch (err) {
          console.error("Error handling plan_buy button:", err);
          const msg = { content: "❌ Could not create ticket. Please try again.", ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(msg);
          } else {
            await interaction.reply(msg);
          }
        }
      }
    }
  });
}
