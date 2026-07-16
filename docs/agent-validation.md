# Agent Validation Guide

This project is designed so an AI agent can validate most behavior without opening the Apps Script editor.

Use agent validation mode only temporarily. Build with `npm run build:agent`, deploy, run checks, then return to `npm run build:private` and push the private manifest back to Apps Script. See [Deployment Modes](deployment-modes.md).

## Public Test Modes

When deployed as a Web App, these URLs are safe for automated checks:

```text
WEB_APP_URL?mode=health
WEB_APP_URL?mode=agent-test
```

`mode=health` returns a small JSON payload.

`mode=agent-test` runs no-side-effect checks inside Apps Script:

- Valid GAS FormFlow v1 JSON passes schema validation.
- Preview returns form and Sheet structure.
- Unsupported item types are rejected with user-readable errors.
- The response declares `sideEffects: "none"`.

This endpoint does not create Google Forms or Google Sheets.

## Private AI Provider Smoke

Real Gemini and Groq calls are intentionally disabled in public `agent` mode. To verify an already configured provider, keep the project in `private` mode, push the private build, and run:

```bash
clasp run apiRunAiProviderSmoke -p '["google-gemini"]'
clasp run apiRunAiProviderSmoke -p '["groq"]'
```

Each smoke test uses the API Key already stored in Apps Script `ScriptProperties`. It lists compatible models, performs one short discussion request, and generates one minimal FormFlow JSON document. The response contains only the provider ID, selected model, model count, and `discussionOk` / `generationOk` booleans; it never returns or logs the API Key.

The smoke test does not create Google Forms or Sheets, but it makes three provider requests and consumes provider quota. It fails closed in `agent` mode. `clasp run` also requires an API executable deployment and an authorized clasp account; see the deployment prerequisites if Apps Script reports that the function cannot be found.

For full state-changing verification:

```text
WEB_APP_URL?mode=create-smoke&confirm=CREATE_TEST_RESOURCES&token=AGENT_SMOKE_TOKEN
```

This creates one real Google Form and one real Google Sheet in the deploying account, then returns the published form URL, edit URL, Sheet URL, announcement text, timestamp, and expected Sheet tabs. `AGENT_SMOKE_TOKEN` must be stored in Apps Script Properties first.

After creation, verify the generated spreadsheet:

```text
WEB_APP_URL?mode=verify-smoke&sheetId=SPREADSHEET_ID&token=AGENT_SMOKE_TOKEN
```

This reads back Sheet tabs, `Clean_Data` headers, `Question_Meta` headers, a `Summary` preview, `Announcement` text, and `Generator_Log` row count.

## Access Limitation

Apps Script Web App access is controlled by Google's deployment layer before project code runs. If an automated HTTP client receives a Google sign-in page or HTTP 403, the request did not reach `doGet`; the Google account, Workspace policy, or deployment setting is blocking anonymous access.

In that case, the agent has three options:

- Use a browser session that is signed in to an allowed Google account.
- Ask the deployer to change the Web App access in Apps Script UI to the broadest allowed option.
- Limit unattended validation to local `npm run check` and signed-in/manual Web App smoke tests.

The repository still exposes `mode=agent-test`; the blocker is deployment access, not application logic.

## Full Creation Test

Full creation can only be validated after the deploying Google account has authorized the required Apps Script scopes. It creates real Google Form and Sheet files under the deployer account, so it should be treated as a state-changing smoke test. Prefer the token-protected `create-smoke` endpoint above for repeatable AI-agent verification.

Recommended human-approved flow:

1. Open the Web App URL as the deploying account.
2. Load an example JSON.
3. Click Validate.
4. Click Preview.
5. Click Create form.
6. Confirm that the result shows:
   - published form URL
   - edit form URL
   - Sheet URL
   - announcement text
   - QR code
7. Open the Sheet and confirm these tabs exist:
   - `Form Responses 1`
   - `Clean_Data`
   - `Question_Meta`
   - `Summary`
   - `Announcement`
   - `Generator_Log`

## Playwright Notes

GAS Web Apps render inside nested Google iframes. Agents using Playwright should find the app frame by looking for a frame whose parent URL contains `userCodeAppPanel` and whose own URL is `/blank` or `about:blank`.

The frontend exposes `window.__e2e` in the app frame with read-only helpers for automated validation:

- `getExampleKeys()`
- `getCurrentJson()`
- `getStatusText()`
- `hasPreview()`
- `loadExample(key)`

Use `data-testid` attributes for stable selectors.
