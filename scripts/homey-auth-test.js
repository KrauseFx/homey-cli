const AthomCloudAPI = require('homey-api/lib/AthomCloudAPI');
const readline = require('node:readline/promises');

const {
  HOMEY_CLIENT_ID,
  HOMEY_CLIENT_SECRET,
  HOMEY_REDIRECT_URL = 'http://localhost:8787/callback',
} = process.env;

if (!HOMEY_CLIENT_ID || !HOMEY_CLIENT_SECRET) {
  console.error('Set HOMEY_CLIENT_ID and HOMEY_CLIENT_SECRET env vars.');
  process.exit(1);
}

(async () => {
  const cloudApi = new AthomCloudAPI({
    clientId: HOMEY_CLIENT_ID,
    clientSecret: HOMEY_CLIENT_SECRET,
    redirectUrl: HOMEY_REDIRECT_URL,
  });

  const loginUrl = cloudApi.getLoginUrl({ state: 'homey-cli-test' });
  console.log('Open this URL in your browser:\n', loginUrl);

  let code = process.env.HOMEY_AUTH_CODE || process.argv[2];
  if (!code) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    code = (await rl.question('Paste the ?code= value from the redirect URL: ')).trim();
    rl.close();
  }

  await cloudApi.authenticateWithAuthorizationCode({ code });

  const user = await cloudApi.getAuthenticatedUser();
  const homey = await user.getFirstHomey();
  const homeyApi = await homey.authenticate();

  const devices = await homeyApi.devices.getDevices();
  console.log(`OK: connected to Homey "${homey.name}", devices: ${Object.keys(devices).length}`);
})();
