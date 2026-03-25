# E2B Guide

E2B is optional in Product OS.

## What E2B Changes

When `E2B_API_KEY` is set, Flow code/review work can run in isolated cloud sandboxes instead of the local fallback sandbox.

That improves:

- environment isolation for repo operations
- consistency across contributors and machines
- separation between the API process and code execution work

If `E2B_API_KEY` is not set, Product OS falls back to the local sandbox automatically.

## Required Env Var

Add this to `packages/api/.env` if you want E2B enabled:

```bash
E2B_API_KEY=...
```

No other E2B-specific config is currently required in this repo.

## Local Behavior

- `E2B_API_KEY` present: Product OS prefers `E2BSandbox`
- `E2B_API_KEY` absent: Product OS uses `LocalSandbox`

The fallback is automatic; you do not need a feature flag beyond the env var.

## What Still Works Without E2B

You can still:

- run the web app and API locally
- sign in
- connect optional integrations
- use product workflows that do not depend on cloud sandboxes

## Current Limitation: Private Repositories

Today, sandbox repo cloning assumes unauthenticated `git clone`, so only public repositories work reliably in Flow code/review mode.

See [private-repo-support.md](private-repo-support.md) for the current design notes and future options.

## Verification

1. Add `E2B_API_KEY` to `packages/api/.env`
2. Restart the API
3. Run a Flow code/review action against a public repository
4. Repeat the same flow with `E2B_API_KEY` removed to confirm the local fallback still works

## Troubleshooting

- If Flow code/review fails on a private repo, that is expected with the current unauthenticated clone flow
- If you recently added `E2B_API_KEY`, restart the API so the env var is picked up
- If you want the fastest local setup, leave E2B disabled and use the local fallback
