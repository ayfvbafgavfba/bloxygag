const dotenv = require("dotenv");
const { once } = require("events");
dotenv.config();

const { Client, GatewayIntentBits, EmbedBuilder, ChannelType } = require("discord.js");
const {
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_TICKET_CATEGORY_ID,
  DISCORD_TICKET_SUPPORT_ROLE_ID,
} = require("./config");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
let clientReadyPromise = Promise.resolve();

if (DISCORD_BOT_TOKEN) {
  clientReadyPromise = once(client, "ready");

  client.once("ready", () => {
    console.log(`Discord ticket bot logged in as ${client.user?.tag}`);
  });

  client.on("error", (error) => {
    console.error("Discord bot error:", error);
  });

  client.login(DISCORD_BOT_TOKEN).catch((error) => {
    console.error("Discord bot login failed:", error);
  });
} else {
  console.warn(
    "[DiscordBot] DISCORD_BOT_TOKEN is missing. Ticket channel creation is disabled."
  );
}

async function ensureReady() {
  if (!DISCORD_BOT_TOKEN) {
    return;
  }
  if (client.isReady()) {
    return;
  }
  await clientReadyPromise;
}

function sanitizeChannelName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

async function createWithdrawTicket({
  username,
  robloxId,
  level,
  items,
  totalValue,
  joinDate,
  lockedCount,
}) {
  if (!DISCORD_BOT_TOKEN) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }

  await ensureReady();

  if (!DISCORD_GUILD_ID) {
    throw new Error("DISCORD_GUILD_ID is not configured");
  }

  const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
  if (!guild) {
    throw new Error("Discord guild not found");
  }

  const channelName = sanitizeChannelName(
    `withdraw-${username || "user"}-${robloxId || "unknown"}-${Date.now()
      .toString()
      .slice(-4)}`
  );

  const channelOptions = {
    name: channelName,
    type: ChannelType.GuildText,
    topic: `Withdrawal ticket for ${username || "Unknown"} (${robloxId || "Unknown"})`,
  };

  if (DISCORD_TICKET_CATEGORY_ID) {
    channelOptions.parent = DISCORD_TICKET_CATEGORY_ID;
  }

  const channel = await guild.channels.create(channelOptions);

  const embed = new EmbedBuilder()
    .setTitle("Withdrawal Ticket")
    .setDescription("A withdrawal request was created on site.")
    .setColor(0x57b9ef)
    .addFields(
      { name: "Onsite Username", value: username || "Unknown", inline: true },
      { name: "Roblox ID", value: robloxId || "Unknown", inline: true },
      { name: "Onsite Level", value: `${level ?? 0}`, inline: true },
      {
        name: "Withdraw Items",
        value: items.length ? items.join("\n") : "None",
      },
      {
        name: "Total Estimated Value",
        value: `R$${totalValue?.toLocaleString() ?? "0"}`,
        inline: true,
      },
      {
        name: "Account Created",
        value: joinDate || "Unknown",
        inline: true,
      }
    )
    .setFooter({ text: `Locked items: ${lockedCount ?? items.length}` });

  const messageOptions = { embeds: [embed] };
  if (DISCORD_TICKET_SUPPORT_ROLE_ID) {
    messageOptions.content = `<@&${DISCORD_TICKET_SUPPORT_ROLE_ID}>`;
  }

  await channel.send(messageOptions);

  return channel;
}

module.exports = {
  createWithdrawTicket,
};
