# SOC2 Readiness — Flow Mode / Coding Agents

This is a public reference document for enterprise/security planning. It is not part of the standard contributor setup path.

This document captures the security controls needed for SOC2 Type II compliance when handling customer code via AI coding agents. These are not implemented yet — this is a roadmap for enterprise readiness.

## Current State (Standard SaaS)

- Agent sandboxes run in-process on the API server (MVP)
- Customer code cloned via GitHub App, stored in temp directory, deleted after session
- Model API calls send code snippets to Anthropic/OpenAI (third-party subprocessors)
- No audit logging of agent actions beyond application logs
- No data residency controls

## SOC2 Trust Service Criteria — Gap Analysis

### CC6: Logical and Physical Access Controls

| Requirement | Status | Action Needed |
|-------------|--------|---------------|
| Sandbox isolation per session | Partial | Migrate to Fargate tasks (1 task = 1 session). No shared filesystem between sessions. |
| No persistent customer code | Partial | Temp dirs are cleaned up, but not cryptographically wiped. Add secure deletion (`shred` or encrypted tmpfs). |
| Least-privilege GitHub access | Not started | GitHub App should request minimum scopes (contents:read, pull_requests:write). No admin access. |
| Network segmentation | Not started | Agent sandboxes in isolated subnet, no access to internal services (DB, secrets). Only outbound to model APIs and GitHub. |
| Secret management | Partial | API keys in env vars. Move to AWS Secrets Manager with rotation. Agent sandboxes should not have access to main DB credentials. |

### CC7: System Operations / Monitoring

| Requirement | Status | Action Needed |
|-------------|--------|---------------|
| Audit log of all agent actions | Not started | Log every exec, file read/write, git operation with timestamp, session ID, user ID. Store in append-only log (S3 + CloudTrail). |
| Immutable agent action trail | Not started | Each sandbox action → structured log entry. Cannot be modified after creation. |
| Alerting on anomalous behavior | Not started | Monitor for: excessive file reads, large data exfiltration, network calls to unexpected hosts, long-running sessions. |
| Incident response plan | Not started | Document: who is notified, how sessions are terminated, how customer is informed. |

### CC8: Change Management

| Requirement | Status | Action Needed |
|-------------|--------|---------------|
| Agent code review before deployment | Partial | PRs required, but no formal sign-off process for agent behavior changes. |
| Model version pinning | Not started | Pin specific model versions (e.g., `claude-opus-4-6-20260205`) rather than aliases. Document when models change. |
| Sandbox image versioning | Not started | Tag and version sandbox container images. No `:latest` in production. |

### CC9: Risk Mitigation

| Requirement | Status | Action Needed |
|-------------|--------|---------------|
| Data residency controls | Not started | Deploy in AWS Sovereign Cloud (eu-central-1-sovereign) for EU customers. Ensure model API calls also go through regional endpoints. |
| Subprocessor documentation | Not started | Document all third-party services that process customer code: Anthropic API, OpenAI API, GitHub API. Maintain a subprocessor list. |
| Data retention policy | Not started | Define: how long are session artifacts kept? When is customer code purged? Default: code deleted immediately after session, artifacts retained for 30 days. |
| Encryption at rest | Partial | Database encrypted (Neon). Temp files on disk are not encrypted. Use encrypted EBS/tmpfs for agent workspaces. |
| Encryption in transit | Yes | TLS everywhere (HTTPS, WSS). Model API calls over HTTPS. |

### Additional Controls for Enterprise

| Control | Description |
|---------|-------------|
| **Customer-managed keys (CMK)** | Allow enterprise customers to provide their own KMS keys for encrypting their data at rest. |
| **VPC peering / PrivateLink** | Enterprise customers may require that agent sandboxes communicate with their GitHub Enterprise via PrivateLink, not public internet. |
| **IP allowlisting** | Provide static egress IPs for agent sandboxes so customers can allowlist in their firewall. |
| **SSO / SCIM** | Enterprise identity management (SAML, OIDC) for team access control. |
| **Data processing agreement (DPA)** | Required for any customer whose code is processed. Must cover: what data is processed, where, for how long, subprocessors, breach notification timeline. |
| **Penetration testing** | Annual third-party pentest covering the agent sandbox infrastructure. |
| **SOC2 Type II audit** | Engage auditor (Vanta, Drata, or manual) once controls are implemented. Observation period: 3-6 months. |

## Architecture Changes for SOC2

### Phase 1: Fargate Migration (Prerequisites for SOC2)

```
┌─────────────────────────────────────────────────┐
│ AWS VPC                                          │
│                                                  │
│  ┌──────────┐     ┌──────────────────────────┐  │
│  │ API       │────▶│ Agent Sandbox (Fargate)   │  │
│  │ Server    │     │ - Isolated task           │  │
│  │ (ECS)     │     │ - No DB access            │  │
│  └──────────┘     │ - Encrypted tmpfs          │  │
│       │            │ - Audit logging sidecar    │  │
│       ▼            └──────────────────────────┘  │
│  ┌──────────┐              │                      │
│  │ RDS/Neon │              ▼                      │
│  │ (DB)     │     ┌──────────────────┐           │
│  └──────────┘     │ Outbound only:   │           │
│                    │ - Anthropic API  │           │
│                    │ - OpenAI API     │           │
│                    │ - GitHub API     │           │
│                    └──────────────────┘           │
└─────────────────────────────────────────────────┘
```

### Phase 2: Sovereign Cloud (EU Enterprise)

- Deploy identical stack in `eu-central-1-sovereign`
- Use Anthropic EU API endpoint (if available) or self-hosted model
- Customer data never leaves the sovereign region
- Separate DPA for EU data processing

## Model API Data Privacy Considerations

When the agent sends code to Anthropic/OpenAI:
- Only **relevant code snippets** are sent (not the full repo)
- Anthropic's API data policy: inputs/outputs are **not used for training** on paid API plans
- OpenAI's API data policy: inputs/outputs are **not used for training** (opt-out by default for API)
- Both provide DPAs for enterprise customers
- For maximum privacy: consider self-hosted models (e.g., Claude on AWS Bedrock in Sovereign Cloud)

## Timeline Estimate

| Phase | Effort | When |
|-------|--------|------|
| In-process MVP (current) | Done | Now |
| Fargate migration | 1-2 weeks | Before public launch |
| Audit logging + monitoring | 1-2 weeks | Before enterprise customers |
| Sovereign Cloud deployment | 1 week (infra-as-code) | On enterprise demand |
| SOC2 Type II observation | 3-6 months | After controls implemented |
| SOC2 Type II report | 1-2 months (auditor) | After observation period |
