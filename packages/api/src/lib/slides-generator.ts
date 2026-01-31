/**
 * Google Slides generator using template with placeholders
 * Uses LLM to intelligently summarize and format content for each slide
 */

import { completion } from "./claude";

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

interface SlideReplacements {
  // Slide 1 - Cover
  productTitle: string; // Max 3 words, e.g. "Discovery Mode"
  date: string;

  // Slide 2 - Problem Statement
  problemStatement: string; // One sentence summary of the user problem

  // Slide 3 - Pain Points (4 actual user pains from discovery)
  pain1: string; // 10-15 chars max
  pain2: string;
  pain3: string;
  pain4: string;
  painClaim: string; // Supporting statement

  // Slide 4 - Strategy (4 cards with headline + text)
  strategy1Headline: string; // 2-3 words
  strategy1Text: string; // One sentence
  strategy2Headline: string;
  strategy2Text: string;
  strategy3Headline: string;
  strategy3Text: string;
  strategy4Headline: string;
  strategy4Text: string;

  // Slide 5 - User Problems (6 short labels)
  problem1: string; // 10-15 chars max
  problem2: string;
  problem3: string;
  problem4: string;
  problem5: string;
  problem6: string;
  problemsFooter: string; // Timeline/roadmap note

  // Slide 6 - Feature Highlights
  featureName: string; // LLM-generated 2-3 word feature name
  gtmHighlight1: string; // Key benefit, 3-5 words
  gtmHighlight2: string;
  gtmHighlight3: string;
  gtmHighlight4: string;
  gtmHighlight5: string;
  gtmDescription: string; // One sentence value prop

  // Slide 7 - KPIs (4 metrics)
  kpi1Name: string; // 1-3 words max, e.g. "Daily Active"
  kpi1Value: string; // e.g. "20%"
  kpi2Name: string;
  kpi2Value: string;
  kpi3Name: string;
  kpi3Value: string;
  kpi4Name: string;
  kpi4Value: string;

  // Slide 8 - Vision
  visionText: string; // Inspiring vision statement, not a roadmap

  // Slide 9 - Closing
  closingText: string;
}

const SLIDE_CONTENT_PROMPT = `You are a product marketing expert creating content for a Product Update presentation.

Given the following product idea and agent outputs, generate precise, slide-ready content.

CRITICAL REQUIREMENTS:
- All text must fit within slide constraints - follow character limits EXACTLY
- Use impactful, professional language
- No ellipsis (...) or truncated text
- Every field must have a complete, meaningful value

OUTPUT FORMAT - Return valid JSON matching this exact structure:

{
  "productTitle": "2-3 word feature name, e.g. 'Discovery Mode' or 'Smart Search'",
  "problemStatement": "One compelling sentence about the user problem we discovered (max 150 chars)",

  "pain1": "First user pain (10-15 chars)",
  "pain2": "Second user pain (10-15 chars)",
  "pain3": "Third user pain (10-15 chars)",
  "pain4": "Fourth user pain (10-15 chars)",
  "painClaim": "Supporting claim about why we're solving this (max 80 chars)",

  "strategy1Headline": "Strategy point 1 (2-3 words)",
  "strategy1Text": "Explanation of strategy 1 (max 60 chars)",
  "strategy2Headline": "Strategy point 2 (2-3 words)",
  "strategy2Text": "Explanation of strategy 2 (max 60 chars)",
  "strategy3Headline": "Strategy point 3 (2-3 words)",
  "strategy3Text": "Explanation of strategy 3 (max 60 chars)",
  "strategy4Headline": "Strategy point 4 (2-3 words)",
  "strategy4Text": "Explanation of strategy 4 (max 60 chars)",

  "problem1": "Problem label 1 (10-15 chars)",
  "problem2": "Problem label 2 (10-15 chars)",
  "problem3": "Problem label 3 (10-15 chars)",
  "problem4": "Problem label 4 (10-15 chars)",
  "problem5": "Problem label 5 (10-15 chars)",
  "problem6": "Problem label 6 (10-15 chars)",
  "problemsFooter": "Roadmap context (max 100 chars)",

  "featureName": "Feature name (2-3 words)",
  "gtmHighlight1": "Key benefit 1 (3-5 words)",
  "gtmHighlight2": "Key benefit 2 (3-5 words)",
  "gtmHighlight3": "Key benefit 3 (3-5 words)",
  "gtmHighlight4": "Key benefit 4 (3-5 words)",
  "gtmHighlight5": "Key benefit 5 (3-5 words)",
  "gtmDescription": "Value proposition sentence (max 80 chars)",

  "kpi1Name": "KPI 1 name (1-3 words)",
  "kpi1Value": "Target value, e.g. '20%' or '+15%'",
  "kpi2Name": "KPI 2 name (1-3 words)",
  "kpi2Value": "Target value",
  "kpi3Name": "KPI 3 name (1-3 words)",
  "kpi3Value": "Target value",
  "kpi4Name": "KPI 4 name (1-3 words)",
  "kpi4Value": "Target value",

  "visionText": "Inspiring vision statement about what this enables (max 120 chars, NOT a roadmap/timeline)",
  "closingText": "Call to action or next steps (max 60 chars)"
}

IMPORTANT:
- productTitle: Extract the core feature name, NOT the full idea. "I want to create a discovery mode for..." → "Discovery Mode"
- pain1-4 and problem1-6: These should be SHORT LABELS like "Broken Search" or "Poor Navigation", NOT full sentences
- kpi1-4Name: Keep these VERY short like "DAU" or "Time Saved" or "Support Load"
- visionText: This is an INSPIRING VISION, not a roadmap. Something like "Empowering teams to build what users truly need"
- All content should be derived from the actual agent outputs, not generic placeholders`;

export async function generateProductUpdateSlides(
  accessToken: string,
  content: SlideContent
): Promise<string> {
  // Step 1: Use LLM to generate properly formatted slide content
  const slideContent = await generateSlideContent(content);

  // Step 2: Copy the template using Drive API
  const copyRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${TEMPLATE_ID}/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Product Update: ${slideContent.productTitle}`,
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

  // Step 3: Build replacement requests for all placeholders
  const replacements = buildReplacements(slideContent);

  const requests: ReplaceRequest[] = replacements.map(([placeholder, value]) => ({
    replaceAllText: {
      containsText: {
        text: placeholder,
        matchCase: false,
      },
      replaceText: value,
    },
  }));

  // Step 4: Execute batch update to replace all placeholders
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

async function generateSlideContent(content: SlideContent): Promise<SlideReplacements> {
  const userMessage = `## Original Product Idea
${content.idea}

## Discovery Agent Output
${content.discovery || "No discovery output available"}

## Strategy Agent Output
${content.strategy || "No strategy output available"}

## Spec Agent Output
${content.spec || "No spec output available"}

## GTM Agent Output
${content.gtm || "No GTM output available"}

Please generate the slide content JSON based on these outputs.`;

  const response = await completion(
    SLIDE_CONTENT_PROMPT,
    [{ role: "user", content: userMessage }]
  );

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to parse LLM response for slides:", response);
    throw new Error("Failed to generate slide content - no JSON in response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as SlideReplacements;

    // Add the date
    parsed.date = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return parsed;
  } catch (e) {
    console.error("Failed to parse slide content JSON:", e, jsonMatch[0]);
    throw new Error("Failed to parse slide content JSON");
  }
}

function buildReplacements(content: SlideReplacements): Array<[string, string]> {
  return [
    // Slide 1 - Cover
    ["{{PRODUCT_TITLE}}", content.productTitle],
    ["{{DATE}}", content.date],

    // Slide 2 - Problem Statement
    ["{{IDEA_SUMMARY}}", content.problemStatement],

    // Slide 3 - Pain Points
    ["{{PAIN_1}}", content.pain1],
    ["{{PAIN_2}}", content.pain2],
    ["{{PAIN_3}}", content.pain3],
    ["{{PAIN_4}}", content.pain4],
    ["{{PAIN_CLAIM}}", content.painClaim],

    // Slide 4 - Strategy
    ["{{STRATEGY_TITLE}}", "Strategic alignment with company OKRs"],
    ["{{STRATEGY_1_HEADLINE}}", content.strategy1Headline],
    ["{{STRATEGY_1_TEXT}}", content.strategy1Text],
    ["{{STRATEGY_2_HEADLINE}}", content.strategy2Headline],
    ["{{STRATEGY_2_TEXT}}", content.strategy2Text],
    ["{{STRATEGY_3_HEADLINE}}", content.strategy3Headline],
    ["{{STRATEGY_3_TEXT}}", content.strategy3Text],
    ["{{STRATEGY_4_HEADLINE}}", content.strategy4Headline],
    ["{{STRATEGY_4_TEXT}}", content.strategy4Text],

    // Slide 5 - User Problems
    ["{{PROBLEMS_TITLE}}", "User Problems we've discovered"],
    ["{{PROBLEM_1}}", content.problem1],
    ["{{PROBLEM_2}}", content.problem2],
    ["{{PROBLEM_3}}", content.problem3],
    ["{{PROBLEM_4}}", content.problem4],
    ["{{PROBLEM_5}}", content.problem5],
    ["{{PROBLEM_6}}", content.problem6],
    ["{{PROBLEMS_FOOTER}}", content.problemsFooter],

    // Slide 6 - Feature Highlights
    ["{{FEATURE_NAME}}", content.featureName],
    ["{{GTM_HIGHLIGHT_1}}", content.gtmHighlight1],
    ["{{GTM_HIGHLIGHT_2}}", content.gtmHighlight2],
    ["{{GTM_HIGHLIGHT_3}}", content.gtmHighlight3],
    ["{{GTM_HIGHLIGHT_4}}", content.gtmHighlight4],
    ["{{GTM_HIGHLIGHT_5}}", content.gtmHighlight5],
    ["{{GTM_DESCRIPTION}}", content.gtmDescription],

    // Slide 7 - KPIs
    ["{{KPI_DESCRIPTION}}", "Metrics we'll track to measure success"],
    ["{{KPI_1_NAME}}", content.kpi1Name],
    ["{{KPI_1_VALUE}}", content.kpi1Value],
    ["{{KPI_2_NAME}}", content.kpi2Name],
    ["{{KPI_2_VALUE}}", content.kpi2Value],
    ["{{KPI_3_NAME}}", content.kpi3Name],
    ["{{KPI_3_VALUE}}", content.kpi3Value],
    ["{{KPI_4_NAME}}", content.kpi4Name],
    ["{{KPI_4_VALUE}}", content.kpi4Value],

    // Slide 8 - Vision
    ["{{VISION_TEXT}}", content.visionText],

    // Slide 9 - Closing
    ["{{CLOSING_TEXT}}", content.closingText],
  ];
}
