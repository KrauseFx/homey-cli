'use strict';

const { createCloudApi, ensureLoggedIn } = require('../homey/auth');
const { getHomeyContext, setActiveHomeyId } = require('../homey/client');
const { formatTable } = require('../format/output');

async function list(ctx) {
  const cloudApi = createCloudApi();
  await ensureLoggedIn(cloudApi);

  const user = await cloudApi.getAuthenticatedUserFromStore({ $cache: true });
  const homeys = user.getHomeys().map(homey => ({
    id: homey.id,
    name: homey.name,
    platform: homey.platform,
    softwareVersion: homey.softwareVersion,
  }));

  ctx.print({ homeys }, payload => {
    if (!payload.homeys.length) return 'No Homeys found.';
    return formatTable(payload.homeys, ['id', 'name', 'platform', 'softwareVersion']);
  });
}

async function use(ctx, args) {
  const homeyId = args[0];
  if (!homeyId) {
    throw new Error('Missing Homey ID. Usage: homey-cli homey use <homeyId>');
  }

  const cloudApi = createCloudApi();
  await ensureLoggedIn(cloudApi);
  const user = await cloudApi.getAuthenticatedUserFromStore({ $cache: true });
  const homey = user.getHomeyById(homeyId);

  setActiveHomeyId(homey.id);
  ctx.print({ activeHomeyId: homey.id, name: homey.name }, payload => `Active Homey set to ${payload.name} (${payload.activeHomeyId}).`);
}

async function whoami(ctx) {
  const { user, homey } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const data = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    homey: {
      id: homey.id,
      name: homey.name,
      platform: homey.platform,
      softwareVersion: homey.softwareVersion,
    },
  };

  ctx.print(data, payload => {
    const userLabel = payload.user.name || payload.user.email || payload.user.id;
    return `User: ${userLabel}\nHomey: ${payload.homey.name} (${payload.homey.id})`;
  });
}

module.exports = {
  list,
  use,
  whoami,
};
