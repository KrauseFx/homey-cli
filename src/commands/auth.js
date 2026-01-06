'use strict';

const readline = require('node:readline/promises');
const { createCloudApi, DEFAULT_REDIRECT_URL } = require('../homey/auth');
const { printOutput } = require('../format/output');

async function login(ctx, args) {
  const cloudApi = createCloudApi();
  const loginUrl = cloudApi.getLoginUrl({ state: 'homey-cli' });

  const providedCode = args[0] || ctx.options.code;
  let code = providedCode;

  if (!code) {
    console.log('Open this URL in your browser and authorize the app:');
    console.log(loginUrl);
    console.log(`Redirect URL: ${process.env.HOMEY_REDIRECT_URL || DEFAULT_REDIRECT_URL}`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    code = (await rl.question('Paste the ?code= value from the redirect URL: ')).trim();
    rl.close();
  }

  if (!code) {
    throw new Error('Missing authorization code.');
  }

  await cloudApi.authenticateWithAuthorizationCode({ code });
  const user = await cloudApi.getAuthenticatedUserFromStore({ $cache: false });

  const data = {
    status: 'ok',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    homeys: user.getHomeys().map(homey => ({
      id: homey.id,
      name: homey.name,
      platform: homey.platform,
      softwareVersion: homey.softwareVersion,
    })),
  };

  ctx.print(data, payload => {
    const lines = [];
    lines.push(`Authenticated as ${payload.user.name || payload.user.email || payload.user.id}.`);
    lines.push(`Homeys: ${payload.homeys.length}`);
    for (const homey of payload.homeys) {
      lines.push(`- ${homey.name} (${homey.id})`);
    }
    return lines.join('\n');
  });
}

async function status(ctx) {
  const cloudApi = createCloudApi();
  const loggedIn = await cloudApi.isLoggedIn();

  if (!loggedIn) {
    const data = { authenticated: false };
    ctx.print(data, () => 'Not authenticated. Run `homey-cli auth login`.');
    return;
  }

  const user = await cloudApi.getAuthenticatedUserFromStore({ $cache: true });
  const data = {
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };

  ctx.print(data, payload => `Authenticated as ${payload.user.name || payload.user.email || payload.user.id}.`);
}

async function logout(ctx) {
  const cloudApi = createCloudApi();
  await cloudApi.logout();
  ctx.print({ status: 'ok' }, () => 'Logged out.');
}

module.exports = {
  login,
  status,
  logout,
};
