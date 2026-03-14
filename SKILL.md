# Homey CLI (skill)

## What this skill does
- Safe, agent-friendly control of Homey.
- Inspect: devices, zones, flows, apps.
- Safe actions: on/off, dim, color, temperature (capability-allowlisted).

## Installed tooling
- Source: `skills/homey-cli/` (Node project)
- Wrapper: `skills/homey-cli/run.sh`
- Secrets: `skills/homey-cli/.env` (you create it)

## One-time setup
- Create `skills/homey-cli/.env` from `skills/homey-cli/.env.example` and set:
  - `HOMEY_CLIENT_ID`
  - `HOMEY_CLIENT_SECRET`
  - `HOMEY_REDIRECT_URL` (e.g. `http://localhost:8787/callback`)
- Then run login:
  - `bash skills/homey-cli/run.sh auth login`

## How you can ask
- “List my Homeys.”
- “Use the Homey named X.”
- “List devices in the living room.”
- “Turn on the kitchen lights.”
- “Dim device <id> to 40%.”

## CLI usage (optional)
- `bash skills/homey-cli/run.sh homey list`
- `bash skills/homey-cli/run.sh homey use <homeyId>`
- `bash skills/homey-cli/run.sh devices list --json`
- `bash skills/homey-cli/run.sh devices on <deviceId>`
- `bash skills/homey-cli/run.sh devices dim <deviceId> 0.4`

## Notes / limits
- Tokens/config are stored by the CLI under `~/.config/homey-cli/`.
- For safety, write ops are capability-allowlisted. Override via `HOMEY_CLI_ALLOWED_CAPABILITIES` if needed.
