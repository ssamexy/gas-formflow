# Deployment Modes

GAS FormFlow uses one codebase with two deployment manifests.

## Private Mode

Private mode is the default and is intended for beginner users copying `dist/Code.gs` and `dist/Index.html`.

- Build command: `npm run build:private`
- Manifest: `config/appsscript.private.json`
- Web App execute as: deployer
- Web App access: only myself
- Purpose: normal self-hosted use

The repository must end in private mode after any public validation run.

## Agent Validation Mode

Agent mode is only for temporary AI-agent verification of a Web App URL.

- Build command: `npm run build:agent`
- Manifest: `config/appsscript.agent.json`
- Web App execute as: deployer
- Web App access: anyone
- Purpose: let an automated agent reach `mode=health` and `mode=agent-test`

Agent mode keeps destructive operations token-protected:

- `apiCreateFormFlow` blocks direct write operations in agent mode.
- `mode=create-smoke` requires `confirm=CREATE_TEST_RESOURCES` and `token=AGENT_SMOKE_TOKEN`.
- `mode=verify-smoke` requires `token=AGENT_SMOKE_TOKEN`.
- `setupAgentSmokeToken(token)` is disabled in agent mode.

## Recommended Verification Flow

1. Start from private mode:
   ```bash
   npm run build:private
   clasp push -f
   ```
2. Set `AGENT_SMOKE_TOKEN` while still private:
   ```bash
   clasp run setupAgentSmokeToken -p "[\"REDACTED_TOKEN\"]"
   ```
3. Switch to agent mode:
   ```bash
   npm run build:agent
   clasp push -f
   clasp deploy --description "temporary agent validation"
   ```
4. Run non-destructive checks:
   ```text
   WEB_APP_URL?mode=health
   WEB_APP_URL?mode=agent-test
   ```
5. Run token-protected destructive smoke only when needed:
   ```text
   WEB_APP_URL?mode=create-smoke&confirm=CREATE_TEST_RESOURCES&token=AGENT_SMOKE_TOKEN
   WEB_APP_URL?mode=verify-smoke&sheetId=SPREADSHEET_ID&token=AGENT_SMOKE_TOKEN
   ```
6. Rotate the token and return to private mode:
   ```bash
   npm run build:private
   clasp push -f
   clasp deploy --description "private deployment"
   ```

7. Undeploy the temporary public agent deployment. Keep the deployment ID local; do not paste it into chat, issues, docs, or commits:
   ```bash
   clasp undeploy TEMPORARY_AGENT_DEPLOYMENT_ID
   ```

Do not paste deployment IDs, project IDs, OAuth client IDs, or tokens into issues, docs, commits, or chat logs.
