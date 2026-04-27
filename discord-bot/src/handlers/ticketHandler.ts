import {
  ButtonInteraction,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  Colors,
  TextChannel,
  Guild,
} from "discord.js";

const TICKET_CATEGORY_NAME = "purchase-tickets";

/**
 * Creates a private purchase-ticket channel for the user who clicked a plan
 * buy button, then sends a summary embed inside it.
 */
export async function handlePlanBuyTicket(
  interaction: ButtonInteraction
): Promise<void> {
  // Decode the plan name from the button's customId ("plan_buy:<encoded>")
  const encoded = interaction.customId.slice("plan_buy:".length);
  const planName = decodeURIComponent(encoded);

  const guild = interaction.guild as Guild;
  const member = await guild.members.fetch(interaction.user.id);

  // Defer the reply so we have time to create the channel
  await interaction.deferReply({ ephemeral: true });

  // Resolve or create the ticket category
  let category = guild.channels.cache.find(
    (c) =>
      c.type === ChannelType.GuildCategory &&
      c.name.toLowerCase() === TICKET_CATEGORY_NAME
  );

  if (!category) {
    category = await guild.channels.create({
      name: TICKET_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
  }

  // Use a stable channel name so duplicate clicks reuse the same ticket
  const channelName = `ticket-${planName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 40)}-${interaction.user.id.slice(-4)}`;

  // Check whether a ticket for this user+plan already exists
  const existing = guild.channels.cache.find(
    (c) => c.name === channelName && c.parentId === category!.id
  );

  if (existing) {
    await interaction.editReply({
      content: `You already have an open ticket for **${planName}**: <#${existing.id}>`,
    });
    return;
  }

  // Create the private channel — visible only to the buyer and guild admins
  const ticketChannel = (await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ],
    topic: `Purchase ticket for plan "${planName}" — opened by ${interaction.user.tag}`,
  })) as TextChannel;

  // Send the welcome embed inside the new ticket channel
  const embed = new EmbedBuilder()
    .setTitle(`🛒 Purchase Ticket — ${planName}`)
    .setDescription(
      `Hello ${member}, welcome to your purchase ticket!\n\n` +
        `A staff member will be with you shortly to complete your purchase of **${planName}**.\n\n` +
        `Please let us know if you have any questions.`
    )
    .addFields({
      name: "Opened by",
      value: `${interaction.user.tag} (<@${interaction.user.id}>)`,
      inline: true,
    })
    .setColor(Colors.Green)
    .setTimestamp();

  await ticketChannel.send({ embeds: [embed] });

  await interaction.editReply({
    content: `✅ Your purchase ticket for **${planName}** has been created: <#${ticketChannel.id}>`,
  });
}
