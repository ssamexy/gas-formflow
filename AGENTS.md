# AGENTS.md - GAS FormFlow

Repo-local instructions for AI agents. Keep changes small, verified, and privacy-safe.

## Project

GAS FormFlow is a Google Apps Script Web App for generating Google Forms, response Sheets, summaries, QR placeholders, and announcement text from JSON specs.

## Structure

- `src/`: editable multi-file Apps Script source.
- `dist/`: beginner copy/paste build output. Do not edit by hand.
- `config/`: deployment manifests.
- `examples/`: JSON specs used for coverage.
- `docs/`: user and agent documentation.
- `tools/`: local build and validation scripts.

## Deployment Modes

Use one codebase with two build modes:

- `private`: default for users and final repo state. Web App is `MYSELF` + `USER_DEPLOYING`.
- `agent`: temporary public validation mode. Web App is `ANYONE` + `USER_DEPLOYING`.

Rules:

- Always leave the repo and Apps Script HEAD in `private` mode after validation.
- Use `agent` mode only long enough to validate Web URLs.
- In `agent` mode, destructive checks must use token-protected endpoints only.
- Never paste deployment IDs, project IDs, OAuth client IDs, tokens, or Web App URLs into commits, docs, issues, or final responses.

## Commands

```bash
npm run build:private
npm run build:agent
npm run check
```

`npm run check` must pass before committing. It builds and validates `private`, then `agent`, then returns to `private`.

For Apps Script:

```bash
clasp push -f
```

Create public deployments only when explicitly needed for agent validation. Undeploy temporary public deployments after validation.

## Safety

- Do not commit `.clasp.json`, `.clasprc.json`, `client_secret.json`, `.agent-smoke-token`, `.env`, or browser test profiles.
- Do not broaden OAuth scopes unless a verified feature requires it.
- Keep Web App access private by default.
- Preserve token checks on `create-smoke` and `verify-smoke`.
- Do not expose raw stack traces to end users.
- Guard spreadsheet writes against formula injection.

## Verification

Minimum before commit:

```bash
npm run check
```

When validating deployed behavior:

- Start from `private`.
- Set or rotate `AGENT_SMOKE_TOKEN` while private.
- Build/push/deploy `agent`.
- Run `mode=health` and `mode=agent-test`.
- Use `create-smoke` / `verify-smoke` only with token and explicit confirmation.
- Return to `private`, push, and undeploy temporary public deployments.
