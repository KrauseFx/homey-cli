'use strict';

const { getHomeyContext } = require('../homey/client');
const { formatTable } = require('../format/output');

async function list(ctx) {
  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const appsMap = await homeyApi.apps.getApps();
  const apps = Object.values(appsMap).map(app => ({
    id: app.id,
    name: app.name,
    version: app.version,
    enabled: app.enabled,
  }));

  ctx.print({ apps }, payload => {
    if (!payload.apps.length) return 'No apps found.';
    return formatTable(payload.apps, ['id', 'name', 'version', 'enabled']);
  });
}

module.exports = {
  list,
};
