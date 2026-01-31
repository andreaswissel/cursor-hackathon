/**
 * Google Slides generator for Product Update presentations
 * Creates a presentation with GTM strategy, OKR alignment, and metrics
 */

interface SlideContent {
  title: string;
  idea: string;
  discovery?: string;
  strategy?: string;
  spec?: string;
  gtm?: string;
}

interface SlideRequest {
  createSlide: {
    objectId: string;
    slideLayoutReference: { predefinedLayout: string };
    placeholderIdMappings?: Array<{
      layoutPlaceholder: { type: string; index?: number };
      objectId: string;
    }>;
  };
}

interface TextRequest {
  insertText: {
    objectId: string;
    text: string;
    insertionIndex: number;
  };
}

interface StyleRequest {
  updateTextStyle: {
    objectId: string;
    style: {
      bold?: boolean;
      fontSize?: { magnitude: number; unit: string };
    };
    textRange: { type: string };
    fields: string;
  };
}

type BatchRequest = SlideRequest | TextRequest | StyleRequest | { deleteObject: { objectId: string } };

export async function generateProductUpdateSlides(
  accessToken: string,
  content: SlideContent
): Promise<string> {
  // Create a new presentation
  const createRes = await fetch("https://slides.googleapis.com/v1/presentations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Product Update: ${content.title}`,
    }),
  });

  if (!createRes.ok) {
    const error = await createRes.text();
    console.error("Failed to create presentation:", error);
    throw new Error(`Failed to create presentation: ${error}`);
  }

  const presentation = await createRes.json();
  const presentationId = presentation.presentationId;

  // Build slide requests
  const requests: BatchRequest[] = [];

  // Delete the default blank slide
  if (presentation.slides?.[0]) {
    requests.push({
      deleteObject: { objectId: presentation.slides[0].objectId },
    });
  }

  // Slide 1: Title Slide
  requests.push({
    createSlide: {
      objectId: "title_slide",
      slideLayoutReference: { predefinedLayout: "TITLE" },
      placeholderIdMappings: [
        { layoutPlaceholder: { type: "CENTERED_TITLE" }, objectId: "title_text" },
        { layoutPlaceholder: { type: "SUBTITLE" }, objectId: "subtitle_text" },
      ],
    },
  });
  requests.push({ insertText: { objectId: "title_text", text: content.title, insertionIndex: 0 } });
  requests.push({ insertText: { objectId: "subtitle_text", text: "Product Update", insertionIndex: 0 } });

  // Slide 2: Problem & Opportunity (from Discovery)
  if (content.discovery) {
    requests.push({
      createSlide: {
        objectId: "discovery_slide",
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
        placeholderIdMappings: [
          { layoutPlaceholder: { type: "TITLE" }, objectId: "discovery_title" },
          { layoutPlaceholder: { type: "BODY" }, objectId: "discovery_body" },
        ],
      },
    });
    requests.push({ insertText: { objectId: "discovery_title", text: "Problem & Opportunity", insertionIndex: 0 } });
    requests.push({ insertText: { objectId: "discovery_body", text: truncateForSlide(content.discovery), insertionIndex: 0 } });
  }

  // Slide 3: Strategy & Positioning
  if (content.strategy) {
    requests.push({
      createSlide: {
        objectId: "strategy_slide",
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
        placeholderIdMappings: [
          { layoutPlaceholder: { type: "TITLE" }, objectId: "strategy_title" },
          { layoutPlaceholder: { type: "BODY" }, objectId: "strategy_body" },
        ],
      },
    });
    requests.push({ insertText: { objectId: "strategy_title", text: "Strategy & Positioning", insertionIndex: 0 } });
    requests.push({ insertText: { objectId: "strategy_body", text: truncateForSlide(content.strategy), insertionIndex: 0 } });
  }

  // Slide 4: Solution Overview (from Spec)
  if (content.spec) {
    requests.push({
      createSlide: {
        objectId: "spec_slide",
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
        placeholderIdMappings: [
          { layoutPlaceholder: { type: "TITLE" }, objectId: "spec_title" },
          { layoutPlaceholder: { type: "BODY" }, objectId: "spec_body" },
        ],
      },
    });
    requests.push({ insertText: { objectId: "spec_title", text: "Solution Overview", insertionIndex: 0 } });
    requests.push({ insertText: { objectId: "spec_body", text: truncateForSlide(extractKeyPoints(content.spec)), insertionIndex: 0 } });
  }

  // Slide 5: Go-to-Market Strategy
  if (content.gtm) {
    requests.push({
      createSlide: {
        objectId: "gtm_slide",
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
        placeholderIdMappings: [
          { layoutPlaceholder: { type: "TITLE" }, objectId: "gtm_title" },
          { layoutPlaceholder: { type: "BODY" }, objectId: "gtm_body" },
        ],
      },
    });
    requests.push({ insertText: { objectId: "gtm_title", text: "Go-to-Market Strategy", insertionIndex: 0 } });
    requests.push({ insertText: { objectId: "gtm_body", text: truncateForSlide(content.gtm), insertionIndex: 0 } });
  }

  // Slide 6: Success Metrics
  requests.push({
    createSlide: {
      objectId: "metrics_slide",
      slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
      placeholderIdMappings: [
        { layoutPlaceholder: { type: "TITLE" }, objectId: "metrics_title" },
        { layoutPlaceholder: { type: "BODY" }, objectId: "metrics_body" },
      ],
    },
  });
  requests.push({ insertText: { objectId: "metrics_title", text: "Success Metrics", insertionIndex: 0 } });
  requests.push({
    insertText: {
      objectId: "metrics_body",
      text: extractMetrics(content.gtm || content.strategy || ""),
      insertionIndex: 0
    }
  });

  // Slide 7: Next Steps / Timeline
  requests.push({
    createSlide: {
      objectId: "next_steps_slide",
      slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
      placeholderIdMappings: [
        { layoutPlaceholder: { type: "TITLE" }, objectId: "next_steps_title" },
        { layoutPlaceholder: { type: "BODY" }, objectId: "next_steps_body" },
      ],
    },
  });
  requests.push({ insertText: { objectId: "next_steps_title", text: "Next Steps", insertionIndex: 0 } });
  requests.push({
    insertText: {
      objectId: "next_steps_body",
      text: "• Finalize technical requirements\n• Begin development sprint\n• Set up analytics tracking\n• Plan beta rollout\n• Gather early feedback",
      insertionIndex: 0
    }
  });

  // Execute batch update
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

// Helper to truncate text for slides (max ~500 chars)
function truncateForSlide(text: string): string {
  // Remove markdown formatting
  let clean = text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Convert markdown lists to bullet points
  clean = clean.replace(/^[-*]\s/gm, "• ");

  // Truncate if too long
  if (clean.length > 800) {
    clean = clean.substring(0, 800) + "...";
  }

  return clean.trim();
}

// Extract key points from spec for slide
function extractKeyPoints(spec: string): string {
  const lines = spec.split("\n");
  const keyPoints: string[] = [];

  for (const line of lines) {
    // Look for headers or bullet points
    if (line.match(/^#{1,3}\s/) || line.match(/^[-*]\s/)) {
      const clean = line.replace(/^#{1,3}\s/, "• ").replace(/^[-*]\s/, "• ");
      keyPoints.push(clean);
      if (keyPoints.length >= 8) break;
    }
  }

  return keyPoints.join("\n") || truncateForSlide(spec);
}

// Extract or generate metrics section
function extractMetrics(text: string): string {
  // Try to find existing metrics in the text
  const metricsMatch = text.match(/metric[s]?:?\s*([\s\S]*?)(?=\n\n|$)/i);
  if (metricsMatch) {
    return truncateForSlide(metricsMatch[1]);
  }

  // Default metrics template
  return `• Adoption Rate: Target X% of users within 30 days
• Engagement: Track feature usage frequency
• Satisfaction: Measure NPS delta
• Performance: Monitor latency and error rates
• Business Impact: Revenue/conversion uplift`;
}
