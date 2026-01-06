'use strict';

const { getHomeyContext } = require('../homey/client');

async function inventory(ctx) {
  const { homey, homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const [zonesMap, devicesMap, flowsMap, advancedFlowsMap] = await Promise.all([
    homeyApi.zones.getZones(),
    homeyApi.devices.getDevices(),
    homeyApi.flow.getFlows(),
    homeyApi.flow.getAdvancedFlows(),
  ]);

  const zones = Object.values(zonesMap).map(zone => ({
    id: zone.id,
    name: zone.name,
    parent: zone.parent,
  }));

  const devices = Object.values(devicesMap).map(device => ({
    id: device.id,
    name: device.name,
    zone: device.zone,
    class: device.class,
    driver: device.driverId,
    capabilities: device.capabilities,
  }));

  const flows = [
    ...Object.values(flowsMap).map(flow => ({ id: flow.id, name: flow.name, type: 'flow' })),
    ...Object.values(advancedFlowsMap).map(flow => ({ id: flow.id, name: flow.name, type: 'advanced' })),
  ];

  const data = {
    homey: {
      id: homey.id,
      name: homey.name,
      platform: homey.platform,
      softwareVersion: homey.softwareVersion,
    },
    zones,
    devices,
    flows,
  };

  ctx.print(data, payload => {
    return [
      `${payload.homey.name} (${payload.homey.id})`,
      `Zones: ${payload.zones.length}`,
      `Devices: ${payload.devices.length}`,
      `Flows: ${payload.flows.length}`,
      'Use --json for full inventory payload.',
    ].join('\n');
  });
}

module.exports = {
  inventory,
};
