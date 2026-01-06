'use strict';

const { getHomeyContext } = require('../homey/client');
const { formatTable } = require('../format/output');

async function catalog(ctx) {
  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const devicesMap = await homeyApi.devices.getDevices();

  const capabilityMap = new Map();

  for (const device of Object.values(devicesMap)) {
    const capabilitiesObj = device.capabilitiesObj || {};
    for (const [id, info] of Object.entries(capabilitiesObj)) {
      if (!capabilityMap.has(id)) {
        capabilityMap.set(id, {
          id,
          type: info.type,
          unit: info.units,
          min: info.min,
          max: info.max,
          setable: info.setable,
          deviceCount: 0,
        });
      }

      const entry = capabilityMap.get(id);
      entry.deviceCount += 1;
      entry.setable = entry.setable || info.setable;
      if (entry.min === undefined && info.min !== undefined) entry.min = info.min;
      if (entry.max === undefined && info.max !== undefined) entry.max = info.max;
    }
  }

  const capabilities = Array.from(capabilityMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  ctx.print({ capabilities }, payload => {
    if (!payload.capabilities.length) return 'No capabilities found.';
    return formatTable(payload.capabilities, ['id', 'type', 'setable', 'deviceCount', 'min', 'max', 'unit']);
  });
}

module.exports = {
  catalog,
};
