const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const glob = require("glob");
const { Client, GatewayIntentBits } = require("discord.js");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const FORUM_CHANNEL_ID = "1255486156758585508";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  const repoRoot = path.resolve(__dirname, "./");
  const files = glob.sync("**/*.tga", { cwd: repoRoot });

  for (const relativeFilePath of files) {
    const absoluteFilePath = path.join(repoRoot, relativeFilePath);
    const parentFolder = path.basename(path.dirname(absoluteFilePath));
    const pngFile = absoluteFilePath.replace(".tga", ".png");

    let mapName = "";
    parentFolder.split("_").forEach((item) => {
      item = item.replace(/^./, (char) => char.toUpperCase());
      mapName += item;
      mapName += " ";
    });
    mapName = mapName
      .replace(/^./, (char) => char.toUpperCase()) // uppercase first char
      .replace(".SC2Map", "");
    mapName.trim();
    let date = new Date().toISOString();

    execSync(`convert "${absoluteFilePath}" "${pngFile}"`);
    console.log(`Converted ${relativeFilePath} to ${pngFile}`);

    // Fetch the forum channel and its threads
    const forumChannel = await client.channels.fetch(FORUM_CHANNEL_ID);
    const threads = await forumChannel.threads.fetchActive();
    let thread = threads.threads.find((t) => t.name === mapName);

    if (!thread) {
      console.log(`Creating new thread for ${mapName}`);
      thread = await forumChannel.threads.create({
        name: mapName,
        message: {
          content:
            "In this channel you can discuss balance for " + mapName + ".",
        },
        autoArchiveDuration: 60, // 1 hour auto-archive
      });
    }

    // Fetch messages in the thread and find the bot's message
    const messages = await thread.messages.fetch();
    const botMessage = messages.find(
      (m) => m.author.id === client.user.id && m.attachments.size > 0
    );

    if (botMessage) {
      console.log(`Updating existing message in thread ${parentFolder}`);
      await botMessage.edit({
        content: `Image for ${mapName} last updated ${date}`,
        files: [pngFile],
      });
    } else {
      console.log(`Posting new message in thread ${parentFolder}`);
      await thread.send({
        content: `Image for ${mapName} last updated ${date}`,
        files: [pngFile],
      });
    }

    // Clean up
    fs.unlinkSync(pngFile);
  }

  client.destroy();
});

client.login(DISCORD_TOKEN);
