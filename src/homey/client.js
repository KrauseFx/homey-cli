'use strict';

const { loadConfig, saveConfig } = require('../config');
const { createCloudApi, ensureLoggedIn } = require('./auth');

function resolveHomeyId(homeys, requestedId) {
  if (requestedId) {
    return requestedId;
  }

  if (homeys.length === 1) {
    return homeys[0].id;
  }

  return null;
}

async function getHomeyContext({ homeyId } = {}) {
  const cloudApi = createCloudApi();
  await ensureLoggedIn(cloudApi);

  const user = await cloudApi.getAuthenticatedUserFromStore({ $cache: true });
  const homeys = user.getHomeys();

  const config = loadConfig();
  const selectedId = homeyId || config.activeHomeyId;
  const resolvedId = resolveHomeyId(homeys, selectedId);

  if (!resolvedId) {
    const error = new Error('Multiple Homeys found. Select one with `homey-cli homey use <id>` or pass --homey <id>.');
    error.code = 'ERR_HOMEY_REQUIRED';
    error.homeys = homeys.map(homey => ({
      id: homey.id,
      name: homey.name,
      platform: homey.platform,
      softwareVersion: homey.softwareVersion,
    }));
    throw error;
  }

  if (selectedId && selectedId !== resolvedId && !homeys.some(homey => homey.id === resolvedId)) {
    const error = new Error(`Homey not found: ${selectedId}`);
    error.code = 'ERR_HOMEY_NOT_FOUND';
    throw error;
  }

  const homey = user.getHomeyById(resolvedId);
  const homeyApi = await homey.authenticate();

  return { cloudApi, user, homey, homeyApi, homeys };
}

function setActiveHomeyId(homeyId) {
  const config = loadConfig();
  config.activeHomeyId = homeyId;
  saveConfig(config);
}

module.exports = {
  getHomeyContext,
  setActiveHomeyId,
};
