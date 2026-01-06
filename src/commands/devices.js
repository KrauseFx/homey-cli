'use strict';

const { getHomeyContext } = require('../homey/client');
const { formatTable } = require('../format/output');
const { getAllowedCapabilities } = require('../safety/allowed');
const { coerceCapabilityValue, ensureCapabilitySetable } = require('../safety/validate');

function buildZoneLookup(zonesMap) {
  const lookup = {};
  for (const zone of Object.values(zonesMap)) {
    lookup[zone.id] = zone.name;
  }
  return lookup;
}

async function getDeviceById(homeyApi, deviceId) {
  const devices = await homeyApi.devices.getDevices();
  const device = devices[deviceId];
  if (!device) {
    const error = new Error(`Device not found: ${deviceId}`);
    error.code = 'ERR_DEVICE_NOT_FOUND';
    throw error;
  }
  return device;
}

async function list(ctx) {
  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const devicesMap = await homeyApi.devices.getDevices();
  const zonesMap = await homeyApi.zones.getZones();
  const zoneLookup = buildZoneLookup(zonesMap);

  const devices = Object.values(devicesMap).map(device => ({
    id: device.id,
    name: device.name,
    zone: zoneLookup[device.zone] || device.zone,
    class: device.class,
    driver: device.driverId,
    available: device.available,
    capabilities: device.capabilities,
  }));

  ctx.print({ devices }, payload => {
    if (!payload.devices.length) return 'No devices found.';
    const rows = payload.devices.map(device => ({
      id: device.id,
      name: device.name,
      zone: device.zone,
      class: device.class,
      available: device.available,
    }));
    return formatTable(rows, ['id', 'name', 'zone', 'class', 'available']);
  });
}

async function get(ctx, args) {
  const deviceId = args[0];
  if (!deviceId) throw new Error('Missing device id. Usage: homey-cli devices get <deviceId>');

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const device = await getDeviceById(homeyApi, deviceId);

  const data = {
    id: device.id,
    name: device.name,
    zone: device.zone,
    class: device.class,
    driver: device.driverId,
    available: device.available,
    capabilities: device.capabilities,
    capabilitiesObj: device.capabilitiesObj,
  };

  ctx.print(data, payload => {
    const lines = [];
    lines.push(`${payload.name} (${payload.id})`);
    lines.push(`Class: ${payload.class}`);
    lines.push(`Zone: ${payload.zone}`);
    lines.push(`Available: ${payload.available}`);
    lines.push(`Capabilities: ${payload.capabilities.join(', ')}`);
    return lines.join('\n');
  });
}

async function capabilities(ctx, args) {
  const deviceId = args[0];
  if (!deviceId) throw new Error('Missing device id. Usage: homey-cli devices capabilities <deviceId>');

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const device = await getDeviceById(homeyApi, deviceId);

  const capabilitiesList = Object.entries(device.capabilitiesObj || {}).map(([id, info]) => ({
    id,
    type: info.type,
    title: info.title,
    unit: info.units,
    min: info.min,
    max: info.max,
    setable: info.setable,
    value: info.value,
  }));

  ctx.print({ deviceId, capabilities: capabilitiesList }, payload => {
    if (!payload.capabilities.length) return 'No capabilities found.';
    return formatTable(payload.capabilities, ['id', 'type', 'setable', 'value', 'min', 'max', 'unit']);
  });
}

async function read(ctx, args) {
  const deviceId = args[0];
  const capabilityId = args[1];
  if (!deviceId || !capabilityId) {
    throw new Error('Usage: homey-cli devices read <deviceId> <capabilityId>');
  }

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const device = await getDeviceById(homeyApi, deviceId);
  const capability = device.capabilitiesObj?.[capabilityId];

  if (!capability) {
    throw new Error(`Capability ${capabilityId} not found on device ${device.name || device.id}.`);
  }

  const data = {
    deviceId: device.id,
    capabilityId,
    value: capability.value,
  };

  ctx.print(data, payload => `${payload.capabilityId}: ${payload.value}`);
}

async function setCapability(ctx, device, capabilityId, rawValue) {
  const allowed = getAllowedCapabilities();
  if (!allowed.has(capabilityId)) {
    throw new Error(`Capability ${capabilityId} is not in the allowlist for safe writes.`);
  }

  const capability = ensureCapabilitySetable(device, capabilityId);
  const value = coerceCapabilityValue(capabilityId, capability, rawValue);

  if (ctx.options.dryRun) {
    return {
      deviceId: device.id,
      capabilityId,
      value,
      dryRun: true,
    };
  }

  await device.setCapabilityValue({ capabilityId, value });
  return { deviceId: device.id, capabilityId, value, status: 'ok' };
}

async function set(ctx, args) {
  const deviceId = args[0];
  const assignment = args[1];
  if (!deviceId || !assignment || !assignment.includes('=')) {
    throw new Error('Usage: homey-cli devices set <deviceId> <capabilityId>=<value>');
  }

  const [capabilityId, rawValue] = assignment.split('=');
  if (!capabilityId) throw new Error('Missing capability id.');

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const device = await getDeviceById(homeyApi, deviceId);
  const result = await setCapability(ctx, device, capabilityId, rawValue);

  ctx.print(result, payload => {
    if (payload.dryRun) {
      return `Dry run: would set ${payload.capabilityId}=${payload.value} on ${payload.deviceId}`;
    }
    return `Set ${payload.capabilityId}=${payload.value} on ${payload.deviceId}`;
  });
}

async function on(ctx, args) {
  const deviceId = args[0];
  if (!deviceId) throw new Error('Usage: homey-cli devices on <deviceId>');

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const device = await getDeviceById(homeyApi, deviceId);
  const result = await setCapability(ctx, device, 'onoff', true);
  ctx.print(result, payload => payload.dryRun ? `Dry run: would turn on ${payload.deviceId}` : `Turned on ${payload.deviceId}`);
}

async function off(ctx, args) {
  const deviceId = args[0];
  if (!deviceId) throw new Error('Usage: homey-cli devices off <deviceId>');

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const device = await getDeviceById(homeyApi, deviceId);
  const result = await setCapability(ctx, device, 'onoff', false);
  ctx.print(result, payload => payload.dryRun ? `Dry run: would turn off ${payload.deviceId}` : `Turned off ${payload.deviceId}`);
}

async function dim(ctx, args) {
  const deviceId = args[0];
  const level = args[1];
  if (!deviceId || level === undefined) throw new Error('Usage: homey-cli devices dim <deviceId> <0..1>');

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const device = await getDeviceById(homeyApi, deviceId);
  const result = await setCapability(ctx, device, 'dim', level);
  ctx.print(result, payload => payload.dryRun ? `Dry run: would set dim=${payload.value} on ${payload.deviceId}` : `Set dim=${payload.value} on ${payload.deviceId}`);
}

function rgbToHsv(r, g, b) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) h = ((gNorm - bNorm) / delta) % 6;
    else if (max === gNorm) h = (bNorm - rNorm) / delta + 2;
    else h = (rNorm - gNorm) / delta + 4;
    h /= 6;
    if (h < 0) h += 1;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

function parseColorInput(input) {
  const raw = String(input).trim();
  const hexMatch = raw.match(/^#?([0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const { h, s, v } = rgbToHsv(r, g, b);
    return { mode: 'hsv', hue: h, saturation: s, value: v };
  }

  const tempMatch = raw.match(/^(temp|temperature|kelvin):?\s*(.+)$/i);
  if (tempMatch) {
    const value = Number(tempMatch[2]);
    if (Number.isNaN(value)) {
      throw new Error('Invalid temperature value.');
    }
    return { mode: 'temperature', value };
  }

  const hsvMatch = raw.match(/^(hsv|hsb):?\s*(.+)$/i);
  if (hsvMatch) {
    const parts = hsvMatch[2].split(',').map(part => Number(part.trim()));
    if (parts.length < 2 || parts.some(value => Number.isNaN(value))) {
      throw new Error('Invalid HSV values. Use hsv:h,s,v');
    }
    let [h, s, v] = parts;
    if (h > 1) h = h / 360;
    if (s > 1) s = s / 100;
    if (v > 1) v = v / 100;
    return { mode: 'hsv', hue: h, saturation: s, value: v };
  }

  if (raw.includes(',')) {
    const parts = raw.split(',').map(part => Number(part.trim()));
    if (parts.length >= 2 && !parts.some(value => Number.isNaN(value))) {
      let [h, s, v] = parts;
      if (h > 1) h = h / 360;
      if (s > 1) s = s / 100;
      if (v > 1) v = v / 100;
      return { mode: 'hsv', hue: h, saturation: s, value: v };
    }
  }

  throw new Error('Unsupported color input. Use #RRGGBB, hsv:h,s,v, or temp:<value>.');
}

async function color(ctx, args) {
  const deviceId = args[0];
  const input = args[1];
  if (!deviceId || !input) {
    throw new Error('Usage: homey-cli devices color <deviceId> <#RRGGBB|hsv:h,s,v|temp:value>');
  }

  const { homeyApi } = await getHomeyContext({ homeyId: ctx.options.homeyId });
  const device = await getDeviceById(homeyApi, deviceId);
  const parsed = parseColorInput(input);

  const results = [];

  if (parsed.mode === 'temperature') {
    const capabilityId = 'light_temperature';
    const allowed = getAllowedCapabilities();
    if (!allowed.has(capabilityId)) {
      throw new Error('Capability light_temperature is not allowed for safe writes.');
    }
    const capability = ensureCapabilitySetable(device, capabilityId);
    const value = coerceCapabilityValue(capabilityId, capability, parsed.value);

    if (ctx.options.dryRun) {
      results.push({ deviceId: device.id, capabilityId, value, dryRun: true });
    } else {
      await device.setCapabilityValue({ capabilityId, value });
      results.push({ deviceId: device.id, capabilityId, value, status: 'ok' });
    }
  } else {
    const allowed = getAllowedCapabilities();
    for (const capabilityId of ['light_hue', 'light_saturation']) {
      if (!allowed.has(capabilityId)) {
        throw new Error(`Capability ${capabilityId} is not allowed for safe writes.`);
      }
      ensureCapabilitySetable(device, capabilityId);
    }

    const hueValue = coerceCapabilityValue('light_hue', device.capabilitiesObj.light_hue, parsed.hue);
    const saturationValue = coerceCapabilityValue('light_saturation', device.capabilitiesObj.light_saturation, parsed.saturation);

    if (ctx.options.dryRun) {
      results.push({ deviceId: device.id, capabilityId: 'light_hue', value: hueValue, dryRun: true });
      results.push({ deviceId: device.id, capabilityId: 'light_saturation', value: saturationValue, dryRun: true });
    } else {
      await device.setCapabilityValue({ capabilityId: 'light_hue', value: hueValue });
      await device.setCapabilityValue({ capabilityId: 'light_saturation', value: saturationValue });
      results.push({ deviceId: device.id, capabilityId: 'light_hue', value: hueValue, status: 'ok' });
      results.push({ deviceId: device.id, capabilityId: 'light_saturation', value: saturationValue, status: 'ok' });
    }
  }

  ctx.print({ deviceId, results }, payload => {
    if (ctx.options.dryRun) {
      return `Dry run: would set ${payload.results.length} color values on ${payload.deviceId}`;
    }
    return `Updated color on ${payload.deviceId}`;
  });
}

module.exports = {
  list,
  get,
  capabilities,
  read,
  set,
  on,
  off,
  dim,
  color,
};
