# ANNEX IV - CERTIFIED SUB-PROCESSORS

This is a public compliance reference document. It is not required for standard local setup or contribution work.

This document lists all sub-processors engaged by ProductOS for processing personal data pursuant to the Data Processing Agreement.

## Sub-Processor List

| Entity | Service | Location | Certification | Data Scope | Safeguards |
|--------|---------|----------|---------------|------------|------------|
| **Anthropic** | AI/LLM Processing (Claude API) | USA | SOC 2 Type II | Prompts, session context, documents, transcriptions | SCCs, DPA, no training on customer data |
| **OpenAI** | AI/LLM Processing, Audio Transcription (Whisper) | USA | SOC 2 Type II | Prompts, video/audio transcriptions, frame analysis | SCCs, DPA, zero data retention API |
| **Google LLC** | AI/LLM (Gemini), OAuth, Workspace APIs (Docs/Sheets/Drive/Slides) | USA/EU | ISO 27001, SOC 2 Type II | User email, profile, documents, spreadsheets, presentations | SCCs, OAuth2, EU data processing addendum |
| **Neon Inc.** | Database Hosting (PostgreSQL) | EU (Germany - AWS eu-central-1) | SOC 2 Type II | All user data, sessions, integrations, outputs | EU data residency, encryption at rest |
| **Notion Labs** | Data Integration | USA | SOC 2 Type II | Pages, databases, blocks (OKRs, feedback) | SCCs, OAuth2, DPA |
| **Airtable Inc.** | Data Integration | USA | SOC 2 Type II | Bases, tables, records (OKRs, feedback) | SCCs, OAuth2 (PKCE), DPA |
| **Atlassian** | Data Integration (Jira) | USA/EU | ISO 27001, SOC 2 Type II | Projects, issues, epics | SCCs, OAuth2, DPA |
| **Slack Technologies** | Data Integration | USA | ISO 27001, SOC 2 Type II | Channel messages, history | SCCs, OAuth2, DPA |
| **Railway Corp.** | Application Hosting | USA | SOC 2 Type II | Application runtime, environment variables | SCCs, encrypted secrets |

## Sub-Processor Security Requirements

- **Mandatory Certifications:** ISO 27001, SOC 2 Type II, relevant local standards
- **Audit Rights:** Controller may audit sub-processors directly with 14 days' notice
- **Incident Response:** Direct notification to Controller within 2 hours
- **Data Localization:** EU processing mandatory unless explicit Controller authorization
- **Contract Terms:** Identical data protection obligations with enhanced liability

## Notes

1. **AI Sub-Processors** (Anthropic, OpenAI, Google Gemini) require enhanced safeguards under Section 7.2 of the DPA:
   - No training on customer data
   - Zero data retention where available
   - Human oversight for all AI-generated recommendations

2. **Integration Providers** (Notion, Airtable, Jira, Slack) only process data when explicitly connected by the user via OAuth2.

3. **Neon** is the only sub-processor with EU data residency by default (AWS eu-central-1, Germany).

4. **US-based providers** require Standard Contractual Clauses (SCCs) per Section 10 of the DPA.

## Change Log

| Date | Change | Authorized By |
|------|--------|---------------|
| 2026-02-07 | Initial sub-processor list created | [Name] |

---

*Last updated: 2026-02-07*
