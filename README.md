# homey-cli

A safe, agent-friendly CLI for Homey. It focuses on day-to-day control and inspection, and **does not** include destructive operations (no deleting devices, no modifying or deleting flows, no app settings changes).

## Features

- Human-readable output by default, `--json` for agents
- Read devices, zones, flows, apps
- Safe control for lights, thermostats, and other common capabilities
- Dry-run mode for validation without execution
- Persistent auth via Homey OAuth

## Install

```bash
npm install
```

## Auth

Set credentials (see `.env.example`):

```bash
export HOMEY_CLIENT_ID="..."
export HOMEY_CLIENT_SECRET="..."
export HOMEY_REDIRECT_URL="http://localhost:8787/callback"
```

Then login:

```bash
homey-cli auth login
```

## Common Commands

```bash
homey-cli homey list
homey-cli homey use <homeyId>

homey-cli devices list
homey-cli devices get <deviceId>
homey-cli devices read <deviceId> onoff
homey-cli devices on <deviceId>
homey-cli devices off <deviceId>
homey-cli devices dim <deviceId> 0.4
homey-cli devices color <deviceId> #FF8800

homey-cli flows list
homey-cli flows trigger <flowId>

homey-cli inventory --json
```

## Output Modes

- Human readable (default)
- `--json` for agent consumption
- `--fields a,b,c` to limit JSON output

## Safety Model

Write operations are restricted to an allowlist of capabilities (e.g. `onoff`, `dim`, `light_hue`, `light_saturation`, `light_temperature`).

To override the allowlist at runtime:

```bash
export HOMEY_CLI_ALLOWED_CAPABILITIES=onoff,dim,target_temperature
```

## Config & Token Storage

Tokens and config are stored under `~/.config/homey-cli/`:

- `credentials.json` (OAuth token)
- `config.json` (active Homey ID)

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Athom or Homey.  
Use at your own risk. The authors are not responsible for any damages or losses resulting from use of this software.

## Development

```bash
node src/cli.js --help
```
