'use strict';

const AthomCloudAPI = require('homey-api/lib/AthomCloudAPI');
const { FileStorageAdapter } = require('./storage');

const DEFAULT_REDIRECT_URL = 'http://localhost:8787/callback';

function getClientConfig() {
  const clientId = process.env.HOMEY_CLIENT_ID;
  const clientSecret = process.env.HOMEY_CLIENT_SECRET;
  const redirectUrl = process.env.HOMEY_REDIRECT_URL || DEFAULT_REDIRECT_URL;

  if (!clientId || !clientSecret) {
    const message = 'Missing HOMEY_CLIENT_ID or HOMEY_CLIENT_SECRET. Set them as environment variables.';
    const error = new Error(message);
    error.code = 'ERR_AUTH_CONFIG';
    throw error;
  }

  return { clientId, clientSecret, redirectUrl };
}

function createCloudApi() {
  const { clientId, clientSecret, redirectUrl } = getClientConfig();
  return new AthomCloudAPI({
    clientId,
    clientSecret,
    redirectUrl,
    store: new FileStorageAdapter(),
    autoRefreshTokens: true,
  });
}

async function ensureLoggedIn(cloudApi) {
  const loggedIn = await cloudApi.isLoggedIn();
  if (!loggedIn) {
    const error = new Error('Not authenticated. Run `homey-cli auth login` first.');
    error.code = 'ERR_NOT_AUTHENTICATED';
    throw error;
  }
}

async function loginWithCode(code) {
  const cloudApi = createCloudApi();
  await cloudApi.authenticateWithAuthorizationCode({ code });
  const user = await cloudApi.getAuthenticatedUserFromStore({ $cache: false });
  return { cloudApi, user };
}

module.exports = {
  createCloudApi,
  ensureLoggedIn,
  loginWithCode,
  DEFAULT_REDIRECT_URL,
};
