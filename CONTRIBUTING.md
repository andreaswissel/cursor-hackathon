# Contributing to Product OS

Thanks for taking the time to contribute.

## Before You Start

1. Follow the local setup flow in [README.md](README.md) and [docs/setup.md](docs/setup.md)
2. Make sure the change is reproducible from a clean Bun install
3. Keep `packages/api/.env.example` updated if you add or change runtime configuration

## Development Workflow

1. Create a branch for your work
2. Make the smallest change that solves the problem clearly
3. Run:

```bash
bun run check
```

4. If you changed setup, integrations, or runtime behavior, update the relevant docs
5. Open a pull request with:
   - a clear summary
   - validation notes
   - screenshots or visual proof when relevant

## Pull Request Guidelines

- Keep PRs focused
- Explain behavior changes, not just file changes
- Link related issues when possible
- Include setup or migration notes if contributors need to do anything new
- For non-UI work, terminal output or rendered validation evidence is fine in the PR description

## What We Expect From Contributions

- No committed secrets, private credentials, or customer data
- No breaking local setup without matching docs updates
- No surprise refactors that are unrelated to the stated problem

## Project Notes

- Bun is the supported package manager
- The default local path uses Docker Postgres on port `5434`
- Third-party connectors and E2B are optional features
- The desktop app is currently experimental

## Questions

If you are unsure where to start, open an issue with:

- the problem you want to solve
- the behavior you expected
- any setup context that might matter
