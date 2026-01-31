/**
 * Slack Channel Seeder Script
 *
 * Creates channels and posts mock internal feedback messages for testing.
 *
 * Prerequisites:
 * 1. Go to https://api.slack.com/apps and select your app
 * 2. Add these OAuth scopes under "OAuth & Permissions":
 *    - channels:manage (to create channels)
 *    - chat:write (to post messages)
 *    - channels:join (to join channels after creating)
 * 3. Reinstall the app to your workspace
 * 4. Copy the Bot User OAuth Token
 *
 * Usage:
 *   SLACK_BOT_TOKEN=xoxb-... bun run packages/api/scripts/seed-slack.ts
 */

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

if (!SLACK_BOT_TOKEN) {
  console.error("Error: SLACK_BOT_TOKEN environment variable is required");
  console.log("\nUsage: SLACK_BOT_TOKEN=xoxb-... bun run packages/api/scripts/seed-slack.ts");
  process.exit(1);
}

// Realistic internal feedback data for Devils Advocate - focused on PDF Export feature
const CHANNELS_WITH_MESSAGES = [
  {
    name: "product",
    messages: [
      "Third user this week asked about PDF export. Starting to see a clear pattern here.",
      "Ran a quick Twitter poll - 73% said they'd use PDF export if we had it. Sample size is small but directionally interesting.",
      "The markdown export is functional but users keep saying it 'looks unprofessional' when they share it.",
      "Thinking about our growth loop - if people export and share reports, that's basically free marketing. PDF with branding could be huge.",
      "User interview yesterday: 'I loved the critique but had to screenshot it to show my co-founder. That felt janky.'",
      "Competitive analysis: Grammarly, Hemingway, and similar tools all have polished PDF exports. It's table stakes.",
      "Feature request volume this week: PDF export (12), dark mode (8), save history (6), follow-up questions (4).",
      "We should think about PDF as the 'share moment' - that's when users become advocates.",
      "Just saw someone on Discord manually copy-paste our output into Canva to make it look nice. We're losing them at the finish line.",
      "Proposal: MVP PDF export with our logo + clean formatting. Can iterate on templates later.",
      "The hackathon deadline is in 3 days - teams need to share reports with mentors NOW, not after we ship PDF in 2 weeks.",
      "One user said they'd pay $5 just for a nice PDF. Interesting signal for monetization.",
    ],
  },
  {
    name: "engineering",
    messages: [
      "PDF generation isn't hard - we can use puppeteer to render HTML to PDF, or a library like pdf-lib.",
      "Heads up: our markdown output is already well-structured. Converting to styled HTML → PDF should be straightforward.",
      "Looked into react-pdf vs puppeteer. Puppeteer gives us more control over styling but adds server overhead. Thoughts?",
      "We could use a service like PDFShift or DocRaptor if we don't want to manage puppeteer in prod.",
      "Current architecture note: the critique output is already JSON with structured sections. PDF templating would be clean.",
      "Estimated effort for basic PDF: 4-6 hours. Branded with nice styling: maybe 8-10 hours.",
      "Quick win idea - we could do HTML export first (1-2 hours) and let users print-to-PDF from browser. Buys us time.",
      "If we go puppeteer route, we need to handle it async - PDF generation could take 2-3 seconds.",
      "Security consideration: make sure we sanitize any user input before rendering to PDF to avoid injection.",
      "The streaming architecture we have is great for real-time, but PDF needs the full report. We already cache the final state so we're good.",
      "Anyone have experience with @react-pdf/renderer? Might be cleaner than puppeteer for this use case.",
      "Deployed a fix for the rate limiting bug. Unrelated but wanted to mention - we were hitting 429s on Gemini.",
    ],
  },
  {
    name: "customer-success",
    messages: [
      "Lost a potential power user today. They said 'I can't share a markdown file with my non-technical co-founder.'",
      "NPS feedback quote: 'Great tool but the output looks like a developer made it. I need something I can present.'",
      "User from the YC batch said they'd recommend us to their whole cohort IF we had shareable reports.",
      "Pattern I'm seeing: solo hackers love the markdown, but TEAMS need something shareable. Teams = bigger word of mouth.",
      "Had a user ask if they could pay for a 'premium report format'. There might be a monetization angle here.",
      "The friction point is clear: people love the critique → try to share → realize they can't → frustration.",
      "Suggestion: even a simple 'copy as formatted text' for Notion/Docs would help, but PDF is the real ask.",
      "User quote: 'I had to explain to my team what all the markdown symbols meant. Just give me a PDF.'",
      "Three users this week mentioned they're presenting to judges/mentors. They need polished exports ASAP.",
      "Interesting: one user said they printed the markdown. PRINTED IT. People really want a document artifact.",
      "We should add a feedback prompt after export: 'Would a PDF export be useful?' to quantify demand.",
      "Someone asked if we integrate with Notion. That's probably the same underlying need - shareable, formatted output.",
    ],
  },
  {
    name: "leadership",
    messages: [
      "If every PDF has our branding, that's impressions at scale. This could be our distribution hack.",
      "Talked to an investor friend - they said 'shareability' is a key metric they look for in prosumer tools.",
      "The hackathon ends this weekend. Would be great to have PDF export as a 'wow' moment for the demo.",
      "Competitive moat thought: our critiques are good, but if the OUTPUT is also beautiful, that's differentiation.",
      "We need to think about this as 'jobs to be done' - user's job isn't to read a critique, it's to IMPROVE and SHARE.",
      "Marketing angle: 'Get roasted. Get polished. Get funded.' - The PDF is the 'polished' artifact.",
      "Are we tracking how many people hit the markdown export? We should, to baseline before adding PDF.",
      "Question for the team: should PDF be free or part of a future paid tier? Let's discuss tomorrow.",
      "I'd prioritize PDF over dark mode right now. Dark mode is nice-to-have, PDF is blocking sharing.",
      "The best products create artifacts people are proud to share. Right now our artifact is... raw markdown.",
    ],
  },
  {
    name: "support",
    messages: [
      "FAQ update: added 'How do I share my report?' - currently says 'copy markdown and paste'. Not a great answer.",
      "Ticket #47: 'PDF export please!' - closed as feature request. That's the 8th one this week.",
      "User asked if they can 'export to Google Docs'. Related to the PDF ask - they want formatted output.",
      "Common support pattern: user finishes critique → asks 'now what?' → we don't have a good share story.",
      "Someone asked for an 'email report to me' feature. Basically the same need - get the output OUT of the app.",
      "Ticket #52: 'The markdown broke when I pasted into Slack'. Slack doesn't render markdown well. PDF would fix this.",
      "Created a saved reply for PDF requests: 'Thanks for the feedback! PDF export is on our radar.' Using it a lot.",
      "User workaround spotted: they're screenshotting the critique panel. That's... not ideal.",
      "Feature request pattern: PDF (12), dark mode (6), save sessions (5), mobile app (3), API access (2).",
      "One user asked if we have a 'print view'. We don't, but that's basically asking for the same thing as PDF.",
      "Suggestion: could we at least add a 'Copy as rich text' button? That would help with Docs/Notion pastes.",
      "Forwarding this support thread to product - user made a really compelling case for why they need PDF for their accelerator application.",
    ],
  },
];

async function slackApi(endpoint: string, body?: object) {
  const res = await fetch(`https://slack.com/api/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API error (${endpoint}): ${data.error}`);
  }
  return data;
}

async function createChannel(name: string): Promise<string> {
  try {
    const data = await slackApi("conversations.create", {
      name,
      is_private: false,
    });
    console.log(`✓ Created channel #${name}`);
    return data.channel.id;
  } catch (err: unknown) {
    const error = err as Error;
    // Channel might already exist
    if (error.message.includes("name_taken")) {
      console.log(`  Channel #${name} already exists, finding it...`);
      const listData = await slackApi("conversations.list", {
        types: "public_channel",
        limit: 200,
      });
      const channel = listData.channels.find(
        (c: { name: string }) => c.name === name
      );
      if (channel) {
        return channel.id;
      }
      throw new Error(`Could not find existing channel #${name}`);
    }
    throw err;
  }
}

async function joinChannel(channelId: string) {
  try {
    await slackApi("conversations.join", { channel: channelId });
  } catch {
    // Ignore errors - bot might already be in channel
  }
}

async function postMessage(channelId: string, text: string) {
  await slackApi("chat.postMessage", {
    channel: channelId,
    text,
  });
}

async function main() {
  console.log("🚀 Seeding Slack workspace with internal feedback channels...\n");

  for (const { name, messages } of CHANNELS_WITH_MESSAGES) {
    try {
      // Create or find channel
      const channelId = await createChannel(name);

      // Join the channel (required to post)
      await joinChannel(channelId);

      // Post messages with a small delay to maintain order
      for (const message of messages) {
        await postMessage(channelId, message);
        await new Promise((r) => setTimeout(r, 500)); // Rate limit protection
      }

      console.log(`  ✓ Posted ${messages.length} messages to #${name}`);
    } catch (err) {
      console.error(`  ✗ Error with #${name}:`, (err as Error).message);
    }
  }

  console.log("\n✅ Done! Channels created:");
  console.log("   #product, #engineering, #customer-success, #leadership, #support");
  console.log("\nNext steps:");
  console.log("1. Go to your app and sync the Slack integration");
  console.log("2. These channels will be auto-detected (they contain feedback-related keywords)");
  console.log("3. Create a new session and select the synced Slack data");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
