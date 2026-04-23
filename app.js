const { App } = require("@slack/bolt");
const Anthropic = require("@anthropic-ai/sdk");
const axios = require("axios");

console.log("APP TOKEN:", process.env.SLACK_APP_TOKEN ? "found" : "MISSING");
console.log("BOT TOKEN:", process.env.SLACK_BOT_TOKEN ? "found" : "MISSING");
console.log("SIGNING:", process.env.SLACK_SIGNING_SECRET ? "found" : "MISSING");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are SpellBot, a sharp and helpful spell-check assistant inside Slack. You specialize in two things:

1. SPELL & GRAMMAR CHECK of plain text the user sends.
2. ANALYZING VIDEO FRAMES / SCREENSHOTS to extract and check all on-screen text, including:
   - Supers (lower thirds, name tags, title cards)
   - Headline text / chyrons
   - Captions and subtitles
   - Any other visible text overlays

When given an image:
- Extract ALL visible text from the image
- Identify any spelling or grammar errors
- Provide corrected versions
- List every correction clearly: "recieve → receive"
- If text looks like a broadcast super or lower third, call that out specifically

When given plain text:
- Spell check it thoroughly
- Correct grammar if clearly wrong
- List each correction

Keep responses concise and professional. No markdown bold or headers. If everything is correct, say so with a brief compliment.`;

// Download a Slack file and return as base64
async function downloadSlackFile(url) {
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    responseType: "arraybuffer",
  });
  const base64 = Buffer.from(response.data).toString("base64");
  const mimeType = response.headers["content-type"] || "image/jpeg";
  return { base64, mimeType };
}

// Call Claude with optional image
async function callClaude(text, imageData = null) {
  const content = [];

  if (imageData) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imageData.mimeType,
        data: imageData.base64,
      },
    });
    content.push({
      type: "text",
      text: text
        ? `${text}\n\nAlso extract and spell-check all visible text in this image, especially supers, lower thirds, titles, or captions.`
        : "Extract ALL visible text from this image — especially supers, lower thirds, chyrons, captions, or title cards — and spell-check everything you find.",
    });
  } else {
    content.push({ type: "text", text });
  }

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  return response.content[0]?.text || "Sorry, I couldn't process that.";
}

// Handle direct messages to the bot
app.message(async ({ message, say }) => {
  // Ignore bot messages and subtypes like channel_join
  if (message.subtype || message.bot_id) return;

  try {
    const text = message.text || "";
    const files = message.files || [];

    // If there's an image or video file attached
    const mediaFile = files.find((f) =>
      f.mimetype?.startsWith("image/") || f.mimetype?.startsWith("video/")
    );

    if (mediaFile) {
      // For images: use directly. For video: use the thumb (Slack generates a thumbnail)
      const fileUrl = mediaFile.mimetype?.startsWith("video/")
        ? mediaFile.thumb_video || mediaFile.url_private
        : mediaFile.url_private;

      await say({ text: "🔍 Analyzing your file for text and supers..." });

      const imageData = await downloadSlackFile(fileUrl);

      // If it's a video, Slack's thumb_video is an image — pass as image/jpeg
      if (mediaFile.mimetype?.startsWith("video/")) {
        imageData.mimeType = "image/jpeg";
      }

      const reply = await callClaude(text, imageData);
      await say({ text: reply });
    } else if (text) {
      // Plain text spell check
      const reply = await callClaude(text);
      await say({ text: reply });
    } else {
      await say({
        text: "Hey! Send me some text to spell-check, or attach a video frame or screenshot and I'll check all the on-screen text for you. ✍️",
      });
    }
  } catch (err) {
    console.error("Error handling message:", err);
    await say({ text: "Something went wrong. Please try again." });
  }
});

// Handle @mentions in channels
app.event("app_mention", async ({ event, say }) => {
  try {
    const text = (event.text || "").replace(/<@[^>]+>/g, "").trim();
    const files = event.files || [];

    const mediaFile = files.find((f) =>
      f.mimetype?.startsWith("image/") || f.mimetype?.startsWith("video/")
    );

    if (mediaFile) {
      await say({ text: "🔍 Analyzing your file for text and supers...", thread_ts: event.ts });

      const fileUrl = mediaFile.mimetype?.startsWith("video/")
        ? mediaFile.thumb_video || mediaFile.url_private
        : mediaFile.url_private;

      const imageData = await downloadSlackFile(fileUrl);
      if (mediaFile.mimetype?.startsWith("video/")) {
        imageData.mimeType = "image/jpeg";
      }

      const reply = await callClaude(text, imageData);
      await say({ text: reply, thread_ts: event.ts });
    } else if (text) {
      const reply = await callClaude(text);
      await say({ text: reply, thread_ts: event.ts });
    } else {
      await say({
        text: "Hi! Mention me with some text to spell-check it, or attach a screenshot/video frame to analyze supers and on-screen text. ✍️",
        thread_ts: event.ts,
      });
    }
  } catch (err) {
    console.error("Error handling mention:", err);
    await say({ text: "Something went wrong. Please try again.", thread_ts: event.ts });
  }
});

(async () => {
  await app.start();
  console.log("⚡ SpellBot is running!");
})();
