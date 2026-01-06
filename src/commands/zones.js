'use strict';

const { getHomeyContext } = require('../homey/client');

function buildZoneTree(zones) {
  const byParent = new Map();
  for (const zone of zones) {
    const parent = zone.parent || null;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(zone);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const lines = [];
  const walk = (parentId, depth) => {
    const children = byParent.get(parentId) || [];
    for (const zone of children) {
      const indent = '  '.repeat(depth);
      lines.push(`${indent}- ${zone.name} (${zone.id})`);
      walk(zone.id, depth + 1);
    }
  };

  walk(null, 0);
  return lines.join('\n');
}

async function list(ctx) {
  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const zonesMap = await homeyApi.zones.getZones();
  const zones = Object.values(zonesMap).map(zone => ({
    id: zone.id,
    name: zone.name,
    parent: zone.parent,
  }));

  ctx.print({ zones }, payload => {
    if (!payload.zones.length) return 'No zones found.';
    return buildZoneTree(payload.zones);
  });
}

module.exports = {
  list,
};
