/**
 * Google Slides generator using template with placeholders
 * Copies a template and replaces {{PLACEHOLDER}} text with actual content
 */

// Template ID from Google Slides
const TEMPLATE_ID = "1Q9gI0UsbTvCriSJUWzO-xrjGDs2LhQX4nT-9TGrnZNM";

interface SlideContent {
  title: string;
  idea: string;
  discovery?: string;
  strategy?: string;
  spec?: string;
  gtm?: string;
}

interface ReplaceRequest {
  replaceAllText: {
    containsText: {
      text: string;
      matchCase: boolean;
    };
    replaceText: string;
  };
}

export async function generateProductUpdateSlides(
  accessToken: string,
  content: SlideContent
): Promise<string> {
  // Step 1: Copy the template using Drive API
  const copyRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${TEMPLATE_ID}/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Product Update: ${content.title}`,
      }),
    }
  );

  if (!copyRes.ok) {
    const error = await copyRes.text();
    console.error("Failed to copy template:", error);
    throw new Error(`Failed to copy template: ${error}`);
  }

  const copiedFile = await copyRes.json();
  const presentationId = copiedFile.id;

  // Step 2: Build replacement requests for all placeholders
  const replacements = buildReplacements(content);

  const requests: ReplaceRequest[] = replacements.map(([placeholder, value]) => ({
    replaceAllText: {
      containsText: {
        text: placeholder,
        matchCase: false,
      },
      replaceText: value,
    },
  }));

  // Step 3: Execute batch update to replace all placeholders
  const batchRes = await fetch(
    `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!batchRes.ok) {
    const error = await batchRes.text();
    console.error("Failed to update presentation:", error);
    throw new Error(`Failed to update presentation: ${error}`);
  }

  return `https://docs.google.com/presentation/d/${presentationId}/edit`;
}

// Build all placeholder replacements from content
function buildReplacements(content: SlideContent): Array<[string, string]> {
  const replacements: Array<[string, string]> = [];

  // Slide 1 - Cover
  replacements.push(["{{PRODUCT_TITLE}}", truncate(content.title, 60)]);
  replacements.push(["{{DATE}}", new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })]);

  // Slide 2 - Idea Overview
  replacements.push(["{{IDEA_SUMMARY}}", truncate(content.idea, 120)]);

  // Slide 3 - Pain Points (from Discovery)
  const painPoints = extractBullets(content.discovery || "", 4);
  replacements.push(["{{PAIN_1}}", painPoints[0] || "Customer pain point 1"]);
  replacements.push(["{{PAIN_2}}", painPoints[1] || "Customer pain point 2"]);
  replacements.push(["{{PAIN_3}}", painPoints[2] || "Customer pain point 3"]);
  replacements.push(["{{PAIN_4}}", painPoints[3] || "Customer pain point 4"]);
  replacements.push(["{{PAIN_CLAIM}}", extractClaim(content.discovery || content.strategy || "")]);

  // Slide 4 - Strategy Analysis
  const strategyPoints = extractHeadlineText(content.strategy || "", 4);
  for (let i = 0; i < 4; i++) {
    replacements.push([`{{STRATEGY_${i + 1}_HEADLINE}}`, strategyPoints[i]?.headline || `Strategy ${i + 1}`]);
    replacements.push([`{{STRATEGY_${i + 1}_TEXT}}`, strategyPoints[i]?.text || "Strategic analysis point"]);
  }
  replacements.push(["{{STRATEGY_TITLE}}", "Strategic alignment with company OKRs"]);

  // Slide 5 - User Problems Discovered
  const problems = extractBullets(content.discovery || "", 6);
  for (let i = 0; i < 6; i++) {
    replacements.push([`{{PROBLEM_${i + 1}}}`, problems[i] || `Problem ${i + 1}`]);
  }
  replacements.push(["{{PROBLEMS_TITLE}}", "User Problems we've discovered"]);
  replacements.push(["{{PROBLEMS_FOOTER}}", extractVisionText(content.strategy || "")]);

  // Slide 6 - Solution Features (from Spec)
  const features = extractHeadlineText(content.spec || "", 6);
  for (let i = 0; i < 6; i++) {
    replacements.push([`{{FEATURE_${i + 1}_HEADLINE}}`, features[i]?.headline || `Feature ${i + 1}`]);
    replacements.push([`{{FEATURE_${i + 1}_TEXT}}`, features[i]?.text || "Feature description"]);
  }

  // Slide 7 - GTM Feature Highlights
  const gtmHighlights = extractBullets(content.gtm || "", 5);
  replacements.push(["{{FEATURE_NAME}}", truncate(content.title, 40)]);
  for (let i = 0; i < 5; i++) {
    replacements.push([`{{GTM_HIGHLIGHT_${i + 1}}}`, gtmHighlights[i] || `Highlight ${i + 1}`]);
  }
  replacements.push(["{{GTM_DESCRIPTION}}", extractGtmDescription(content.gtm || "")]);

  // Slide 9 - KPIs
  const kpis = extractKPIs(content.gtm || content.strategy || "");
  for (let i = 0; i < 4; i++) {
    replacements.push([`{{KPI_${i + 1}_NAME}}`, kpis[i]?.name || `KPI ${i + 1}`]);
    replacements.push([`{{KPI_${i + 1}_VALUE}}`, kpis[i]?.value || "TBD"]);
  }
  replacements.push(["{{KPI_DESCRIPTION}}", "Metrics we'll track to measure success"]);

  // Slide 10 - Vision
  replacements.push(["{{VISION_TEXT}}", extractVisionText(content.gtm || content.strategy || content.idea)]);

  // Slide 11 - Closing
  replacements.push(["{{CLOSING_TEXT}}", "Ready to build the future together"]);

  return replacements;
}

// Helper: Truncate text to max length
function truncate(text: string, maxLength: number): string {
  const clean = cleanMarkdown(text);
  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength - 3).trim() + "...";
}

// Helper: Clean markdown formatting
function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

// Helper: Extract bullet points as array
function extractBullets(text: string, count: number): string[] {
  const bullets: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for bullet points, numbered lists, or headers
    const isBullet = trimmed.match(/^[-*•]\s/) || trimmed.match(/^\d+\.\s/);
    const isHeader = trimmed.match(/^#{1,3}\s/);

    if (isBullet || isHeader) {
      let content = trimmed
        .replace(/^[-*•]\s*/, "")
        .replace(/^\d+\.\s*/, "")
        .replace(/^#{1,3}\s*/, "");

      content = truncate(content, 50);
      if (content && content.length > 5) {
        bullets.push(content);
      }
    }

    if (bullets.length >= count) break;
  }

  // If not enough bullets found, extract sentences
  while (bullets.length < count) {
    const sentences = text
      .replace(/\n+/g, " ")
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 100);

    for (const sentence of sentences) {
      if (bullets.length >= count) break;
      const clean = truncate(sentence, 50);
      if (clean && !bullets.includes(clean)) {
        bullets.push(clean);
      }
    }
    break;
  }

  return bullets;
}

// Helper: Extract headline + text pairs for cards
function extractHeadlineText(text: string, count: number): Array<{ headline: string; text: string }> {
  const results: Array<{ headline: string; text: string }> = [];
  const lines = text.split("\n");

  let currentHeadline = "";
  let currentText = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Headers become headlines
    if (trimmed.match(/^#{1,3}\s/)) {
      // Save previous if exists
      if (currentHeadline) {
        results.push({
          headline: truncate(currentHeadline, 30),
          text: truncate(currentText, 80),
        });
        if (results.length >= count) break;
      }
      currentHeadline = trimmed.replace(/^#{1,3}\s*/, "");
      currentText = "";
    } else if (currentHeadline) {
      // Add to current text
      currentText += " " + trimmed.replace(/^[-*•]\s*/, "");
    }
  }

  // Don't forget the last one
  if (currentHeadline && results.length < count) {
    results.push({
      headline: truncate(currentHeadline, 30),
      text: truncate(currentText, 80),
    });
  }

  // Fill remaining with defaults
  while (results.length < count) {
    results.push({
      headline: `Point ${results.length + 1}`,
      text: "Details to be added",
    });
  }

  return results;
}

// Helper: Extract a claim/positioning statement
function extractClaim(text: string): string {
  const sentences = text.split(/[.!?]+/).map(s => s.trim());

  // Look for sentences with strong positioning words
  const claimWords = ["we", "our", "should", "will", "can", "best", "leading", "unique"];
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (claimWords.some(w => lower.includes(w)) && sentence.length > 20 && sentence.length < 120) {
      return truncate(sentence, 100);
    }
  }

  return "We're uniquely positioned to solve this problem";
}

// Helper: Extract GTM description
function extractGtmDescription(text: string): string {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  if (sentences.length > 0) {
    return truncate(sentences[0], 100);
  }
  return "Launching a solution that transforms how users work";
}

// Helper: Extract vision/closing text
function extractVisionText(text: string): string {
  const sentences = text.split(/[.!?]+/).map(s => s.trim());

  // Look for vision-type sentences
  const visionWords = ["vision", "goal", "aim", "future", "transform", "enable", "empower"];
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (visionWords.some(w => lower.includes(w)) && sentence.length > 20) {
      return truncate(sentence, 120);
    }
  }

  // Return a good concluding sentence
  if (sentences.length > 0) {
    const lastGood = sentences.filter(s => s.length > 30 && s.length < 150).pop();
    if (lastGood) return truncate(lastGood, 120);
  }

  return "Building the future of product development";
}

// Helper: Extract KPIs with names and values
function extractKPIs(text: string): Array<{ name: string; value: string }> {
  const kpis: Array<{ name: string; value: string }> = [];
  const lines = text.split("\n");

  // Look for metric-like patterns
  const metricPatterns = [
    /(\d+%)/,
    /(\d+x)/i,
    /([\d.]+\s*(days?|weeks?|months?))/i,
    /(\$[\d,]+)/,
  ];

  for (const line of lines) {
    for (const pattern of metricPatterns) {
      const match = line.match(pattern);
      if (match) {
        const value = match[1];
        const name = truncate(line.replace(match[0], "").replace(/[-:•*]/g, ""), 25);
        if (name && name.length > 3) {
          kpis.push({ name, value });
          break;
        }
      }
    }
    if (kpis.length >= 4) break;
  }

  // Default KPIs if not enough found
  const defaultKPIs = [
    { name: "User Adoption", value: "Target %" },
    { name: "Time Saved", value: "X hours" },
    { name: "Satisfaction", value: "+NPS" },
    { name: "Engagement", value: "Target %" },
  ];

  while (kpis.length < 4) {
    kpis.push(defaultKPIs[kpis.length]);
  }

  return kpis;
}
