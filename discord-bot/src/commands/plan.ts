import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("plan")
  .setDescription("Manage purchase plans")
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Create a plan listing with a buy button")
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("Name of the plan")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("price")
          .setDescription('Price of the plan (e.g. "$9.99 / month")')
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("description")
          .setDescription("Short description of what the plan includes")
          .setRequired(false)
      )
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "create") {
    const planName = interaction.options.getString("name", true);
    const price = interaction.options.getString("price", true);
    const description =
      interaction.options.getString("description") ??
      "Click the button below to open a purchase ticket.";

    const embed = new EmbedBuilder()
      .setTitle(`📦 ${planName}`)
      .setDescription(description)
      .addFields({ name: "💰 Price", value: price, inline: true })
      .setColor(Colors.Gold)
      .setFooter({ text: "Click the button below to purchase this plan." })
      .setTimestamp();

    // customId format: plan_buy:<planName>
    // Slice the raw name first, then encode, so we never cut through an encoded sequence.
    const safeName = planName.slice(0, 80);
    const safeId = `plan_buy:${encodeURIComponent(safeName)}`;

    const button = new ButtonBuilder()
      .setCustomId(safeId)
      .setLabel(`Buy ${planName}`)
      .setStyle(ButtonStyle.Success)
      .setEmoji("🛒");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row] });
  }
}
