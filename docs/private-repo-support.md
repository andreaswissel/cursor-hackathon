# Private Repository Support

This is a maintainer/reference note for future sandbox auth work. It is not required for standard local setup.

## Current State

The code-agent and review-agent clone repos via `git clone` inside E2B cloud sandboxes (or local sandbox). No authentication is passed, so only **public repos** work today.

## Options

### Option A — GitHub PAT (Simplest)

User provides a GitHub Personal Access Token. We inject it into the clone URL:

```
https://<token>@github.com/user/repo.git
```

**Implementation:**
- Add `githubToken` field to `users` table (encrypted at rest)
- Project settings UI: "GitHub Token" input field
- At clone time, rewrite the URL to embed the token
- Strip token from all agent logs before emitting via SSE

**Pros:** Fast to build, works immediately
**Cons:** User manages token manually, token has broad scope

### Option B — GitHub App OAuth (Proper)

Register a GitHub App. User installs it on their repos, we get scoped installation tokens.

**Implementation:**
- Create a GitHub App with `contents:read` (review) and `contents:write` (code) permissions
- Add GitHub OAuth flow (like existing Google OAuth)
- Store installation ID per user/org
- At clone time, mint a short-lived installation token and inject into clone URL

**Pros:** Best UX, scoped permissions, no manual token management
**Cons:** More work, requires GitHub App registration, approval for public listing

### Option C — Deploy Keys (Per-repo SSH)

User adds an SSH deploy key to their repo. We inject the private key into the sandbox.

**Implementation:**
- Generate SSH keypair per project
- Show public key in UI for user to add as deploy key
- Inject private key into E2B VM at `~/.ssh/id_rsa` before cloning
- Clone via SSH URL: `git@github.com:user/repo.git`

**Pros:** Most secure, per-repo scoping
**Cons:** Worst UX, user must configure each repo manually

## Recommendation

Start with **Option A** (PAT) for MVP, then migrate to **Option B** (GitHub App OAuth) for production. Option C is overkill unless enterprise customers require it.

## Security Considerations

- Never log tokens or include them in SSE events
- Encrypt tokens at rest in the database
- E2B sandboxes are ephemeral — token only lives for the duration of the clone
- Consider token rotation reminders for PAT approach
