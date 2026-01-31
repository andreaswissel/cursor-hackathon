/**
 * Jira Seeder Script - Creates OKRs (Epics) and Feedback (Stories)
 * for Devils Advocate PDF Export demo
 */

const JIRA_EMAIL = process.env.JIRA_EMAIL || "";
const JIRA_TOKEN = process.env.JIRA_TOKEN || "";
const JIRA_BASE = "https://andreaswissel.atlassian.net";
const PROJECT_KEY = "KAN";

if (!JIRA_EMAIL || !JIRA_TOKEN) {
  console.error("Error: JIRA_EMAIL and JIRA_TOKEN environment variables required");
  console.log("\nUsage: JIRA_EMAIL=you@example.com JIRA_TOKEN=... bun run packages/api/scripts/seed-jira.ts");
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString("base64");

async function jiraApi(endpoint: string, method = "GET", body: unknown = null) {
  const res = await fetch(`${JIRA_BASE}/rest/api/3${endpoint}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jira API error (${res.status}): ${err}`);
  }

  return res.json();
}

async function getIssueTypes(): Promise<Record<string, string>> {
  const data = await jiraApi(`/project/${PROJECT_KEY}`);
  console.log("Project:", data.name);

  const meta = await jiraApi(
    `/issue/createmeta?projectKeys=${PROJECT_KEY}&expand=projects.issuetypes`
  );
  const project = meta.projects[0];
  const types: Record<string, string> = {};
  for (const t of project.issuetypes) {
    types[t.name] = t.id;
    console.log(`  Issue type: ${t.name} (${t.id})`);
  }
  return types;
}

async function createIssue(issueTypeId: string, summary: string, description: string) {
  const body = {
    fields: {
      project: { key: PROJECT_KEY },
      summary,
      description: {
        type: "doc",
        version: 1,
        content: [
          { type: "paragraph", content: [{ type: "text", text: description }] },
        ],
      },
      issuetype: { id: issueTypeId },
    },
  };

  const result = await jiraApi("/issue", "POST", body);
  return result.key;
}

// OKRs as Epics
const epics = [
  {
    summary: "Increase user engagement and virality",
    description:
      "Key Results: (1) Session-to-share rate from 5% to 25%. (2) Grow weekly active users by 40% through organic sharing. (3) Achieve 3+ critique sessions per user per week.",
  },
  {
    summary: "Reduce friction in user journey",
    description:
      "Key Results: (1) Decrease 'how do I share?' support tickets by 60%. (2) Time from critique completion to sharing under 30 seconds. (3) Report export rate to 50% of completed sessions.",
  },
];

// Customer feedback as Stories
const stories = [
  {
    summary: "PDF Export: Users can't share reports professionally",
    description:
      "Multiple users report that markdown export looks unprofessional when sharing with co-founders, mentors, and judges. They're requesting PDF export with nice formatting.",
  },
  {
    summary: "Share button needed - users screenshotting as workaround",
    description:
      "Users are taking screenshots of the critique panel to share results. Need a proper share mechanism.",
  },
  {
    summary: "Markdown breaks when pasted into Slack/Teams",
    description:
      "Bug report: The markdown export doesn't render properly in Slack. Users need a format that works across platforms.",
  },
  {
    summary: "Request: Branded PDF for accelerator applications",
    description:
      "YC applicant requested ability to export critique as branded PDF to attach to their application.",
  },
  {
    summary: "Non-technical co-founders confused by markdown",
    description:
      "Feedback: 'I had to explain what all the markdown symbols meant to my co-founder. Just give me a PDF.'",
  },
  {
    summary: "Export to Google Docs / Notion requested",
    description:
      "Users want formatted export that works in common doc tools. Related to PDF request - core need is presentable output.",
  },
  {
    summary: "Print view missing",
    description:
      "User tried to print the critique - no print-friendly view available. Need print CSS or PDF export.",
  },
  {
    summary: "Premium export feature - potential monetization",
    description:
      "Multiple users indicated willingness to pay for polished PDF export. Consider for monetization.",
  },
];

async function main() {
  console.log("🚀 Seeding Jira with Devils Advocate OKRs and Feedback...\n");

  try {
    const types = await getIssueTypes();

    const epicTypeId = types["Epic"] || null;
    const storyTypeId = types["Story"] || types["Task"] || Object.values(types)[0];

    console.log("\nUsing issue type IDs:", { epic: epicTypeId, story: storyTypeId });

    // Create Epics (OKRs)
    if (epicTypeId) {
      console.log("\n📊 Creating OKR Epics...");
      for (const epic of epics) {
        const key = await createIssue(epicTypeId, epic.summary, epic.description);
        console.log(`  ✓ ${key}: ${epic.summary}`);
      }
    } else {
      console.log("\n⚠️  No Epic type found, skipping OKRs");
    }

    // Create Stories (Feedback)
    console.log("\n💬 Creating Feedback Stories...");
    for (const story of stories) {
      const key = await createIssue(storyTypeId, story.summary, story.description);
      const shortSummary = story.summary.substring(0, 50);
      console.log(`  ✓ ${key}: ${shortSummary}...`);
    }

    console.log("\n✅ Done! Check your Jira board at:");
    console.log(
      "   https://andreaswissel.atlassian.net/jira/software/projects/KAN/boards/2"
    );
  } catch (err) {
    console.error("Error:", (err as Error).message);
  }
}

main();
