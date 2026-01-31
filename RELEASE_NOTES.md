# Release Notes - January 31, 2026

## Product OS v0.2.0 - "Slides & Polish"

This release adds automatic Google Slides generation, a new Product Marketing agent, and significant UX improvements across the app.

---

### New Features

#### Google Slides Integration
- **Automatic presentation generation** from agent outputs
- Uses a professionally designed template with placeholder replacement
- **LLM-powered content formatting** - the AI intelligently summarizes and formats content to fit slide constraints:
  - Product titles condensed to 2-3 words (e.g., "Discovery Mode")
  - Pain points as short labels (10-15 chars)
  - KPI names limited to 1-3 words
  - Vision statements that inspire, not roadmaps
- Slides are created in your Google Drive and linked in the session output
- Requires Google integration with Drive and Slides permissions

#### Product Marketing Agent
- New agent in the workflow that creates **internal product updates** for Teams/Slack
- Synthesizes all agent outputs into a scannable announcement format
- Includes: summary, problem statement, solution, key benefits, OKR alignment, success metrics, timeline, and call-to-action
- Output available as copyable markdown in the session sidebar

#### Enhanced Demo Data
- **Internal Feedback**: Sample Slack/Teams conversations from your company (PM discussions, sales insights, support escalations)
- **Product Metrics**: Sample Mixpanel/Segment data with trends, deltas, and metric descriptions
- Both new data types available in the data source selector on the home page

---

### UX Improvements

#### Styled Confirmation Dialogs
- Replaced browser `alert()` and `confirm()` with custom modal overlays
- Matches the app's clean, minimal design language
- Features:
  - Destructive variant with red accent for delete/disconnect actions
  - Alert-only mode for error notifications
  - Smooth entry animations
  - Full keyboard support (Escape to cancel, Enter to confirm)
  - Focus management and body scroll lock

#### Progress Indicator Redesign
- Removed gradient styling that looked like generic "AI slop"
- Clean, minimal progress bar with monochrome styling
- Fixed progress calculation to properly track worker agents (was stuck at 20%)
- Shows current phase title and description

---

### Bug Fixes

- **Fixed `spec.split is not a function`** - Spec output is now correctly stored as markdown string, not object
- **Fixed progress bar stuck at 20%** - Excluded orchestrator from progress calculation since it runs throughout
- **Fixed Google Slides permission error** - Added `drive.file` scope for template copying
- **Fixed deployment issues** - Resolved bun.lock sync problems causing Railway builds to hang

---

### Technical Changes

- Added `drive.file` OAuth scope to Google integration (users need to re-authenticate)
- New `ConfirmDialog` component at `packages/web/src/components/confirm-dialog.tsx`
- Slides generator rewritten to use LLM completion instead of regex extraction
- Product Marketing agent at `packages/api/src/agents/product-marketing-agent.ts`
- Session outputs now include `productUpdate` field for Teams/Slack content

---

### Breaking Changes

- **Google integration requires re-authentication** to grant the new `drive.file` permission for slides generation

---

### What's Next

- Authentication flow improvements
- Rate limiting for demo mode
- Additional integrations (Jira, Notion sync)
- Chat-based refinement of agent outputs
