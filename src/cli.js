#!/usr/bin/env node
'use strict';

const { printOutput, formatTable } = require('./format/output');
const auth = require('./commands/auth');
const homey = require('./commands/homey');
const zones = require('./commands/zones');
const devices = require('./commands/devices');
const flows = require('./commands/flows');
const apps = require('./commands/apps');
const inventory = require('./commands/inventory');
const capabilities = require('./commands/capabilities');

function parseArgs(argv) {
  const options = {
    json: false,
    fields: null,
    strict: false,
    dryRun: false,
    homeyId: null,
    code: null,
    help: false,
  };
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--human') {
      options.json = false;
      continue;
    }
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--fields') {
      options.fields = argv[i + 1] ? argv[i + 1].split(',').map(item => item.trim()).filter(Boolean) : [];
      i += 1;
      continue;
    }
    if (arg === '--homey') {
      options.homeyId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--code') {
      options.code = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    positionals.push(arg);
  }

  return { options, positionals };
}

function printHelp() {
  const lines = [
    'homey-cli <command>',
    '',
    'Auth',
    '  homey-cli auth login [code]',
    '  homey-cli auth status',
    '  homey-cli auth logout',
    '',
    'Homey',
    '  homey-cli homey list',
    '  homey-cli homey use <homeyId>',
    '  homey-cli homey whoami',
    '',
    'Zones',
    '  homey-cli zones list',
    '',
    'Devices',
    '  homey-cli devices list',
    '  homey-cli devices get <deviceId>',
    '  homey-cli devices capabilities <deviceId>',
    '  homey-cli devices read <deviceId> <capabilityId>',
    '  homey-cli devices set <deviceId> <capabilityId>=<value>',
    '  homey-cli devices on <deviceId>',
    '  homey-cli devices off <deviceId>',
    '  homey-cli devices dim <deviceId> <0..1>',
    '  homey-cli devices color <deviceId> <#RRGGBB|hsv:h,s,v|temp:value>',
    '',
    'Flows',
    '  homey-cli flows list',
    '  homey-cli flows get <flowId>',
    '  homey-cli flows trigger <flowId>',
    '  homey-cli flows trigger-by-name "<flow name>"',
    '',
    'Apps',
    '  homey-cli apps list',
    '',
    'Inventory',
    '  homey-cli inventory',
    '',
    'Capabilities',
    '  homey-cli capabilities catalog',
    '',
    'Flags',
    '  --json           JSON output (agent-friendly)',
    '  --human          Human-readable output (default)',
    '  --fields a,b     Limit JSON output fields',
    '  --homey <id>     Use specific Homey ID',
    '  --strict         Fail on ambiguous matches',
    '  --dry-run        Validate without executing writes',
  ];

  console.log(lines.join('\n'));
}

function createContext(options) {
  return {
    options,
    print: (data, humanFormatter) => printOutput(data, options, humanFormatter),
  };
}

async function runCommand(ctx, positionals) {
  const [group, action, ...args] = positionals;

  if (!group) {
    printHelp();
    return;
  }

  if (group === 'auth') {
    if (action === 'login') return auth.login(ctx, args);
    if (action === 'status') return auth.status(ctx);
    if (action === 'logout') return auth.logout(ctx);
  }

  if (group === 'homey') {
    if (action === 'list') return homey.list(ctx);
    if (action === 'use') return homey.use(ctx, args);
    if (action === 'whoami') return homey.whoami(ctx);
  }

  if (group === 'zones') {
    if (action === 'list') return zones.list(ctx);
  }

  if (group === 'devices') {
    if (action === 'list') return devices.list(ctx);
    if (action === 'get') return devices.get(ctx, args);
    if (action === 'capabilities') return devices.capabilities(ctx, args);
    if (action === 'read') return devices.read(ctx, args);
    if (action === 'set') return devices.set(ctx, args);
    if (action === 'on') return devices.on(ctx, args);
    if (action === 'off') return devices.off(ctx, args);
    if (action === 'dim') return devices.dim(ctx, args);
    if (action === 'color') return devices.color(ctx, args);
  }

  if (group === 'flows') {
    if (action === 'list') return flows.list(ctx);
    if (action === 'get') return flows.get(ctx, args);
    if (action === 'trigger') return flows.trigger(ctx, args);
    if (action === 'trigger-by-name') return flows.triggerByName(ctx, args);
  }

  if (group === 'apps') {
    if (action === 'list') return apps.list(ctx);
  }

  if (group === 'inventory') {
    return inventory.inventory(ctx);
  }

  if (group === 'capabilities') {
    if (!action || action === 'catalog') return capabilities.catalog(ctx);
  }

  throw new Error(`Unknown command: ${positionals.join(' ')}`);
}

function formatError(err) {
  const payload = {
    message: err.message || 'Unknown error',
  };
  if (err.code) payload.code = err.code;
  if (err.homeys) payload.homeys = err.homeys;
  return payload;
}

async function main() {
  const { options, positionals } = parseArgs(process.argv.slice(2));
  const ctx = createContext(options);

  if (options.help) {
    printHelp();
    return;
  }

  try {
    await runCommand(ctx, positionals);
  } catch (err) {
    const payload = formatError(err);

    if (options.json) {
      console.log(JSON.stringify({ error: payload }, null, 2));
    } else {
      console.error(`Error: ${payload.message}`);
      if (payload.homeys) {
        console.error('\nAvailable Homeys:');
        const table = formatTable(payload.homeys, ['id', 'name', 'platform', 'softwareVersion']);
        if (table) console.error(table);
      }
    }

    process.exitCode = 1;
  }
}

main();
