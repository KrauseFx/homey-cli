'use strict';

function parseRawValue(raw) {
  if (raw === undefined || raw === null) return raw;
  if (typeof raw !== 'string') return raw;

  const trimmed = raw.trim();
  if (!trimmed) return '';

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return raw;
    }
  }

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return raw;
}

function ensureNumber(value, capabilityId) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numberValue)) {
    throw new Error(`Capability ${capabilityId} expects a number.`);
  }
  return numberValue;
}

function ensureBoolean(value, capabilityId) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`Capability ${capabilityId} expects a boolean.`);
}

function ensureEnum(value, capability, capabilityId) {
  const values = capability.values || capability.opts?.values;
  if (!values) return String(value);

  const normalized = String(value);
  if (Array.isArray(values)) {
    const match = values.find(entry => String(entry.id ?? entry) === normalized);
    if (!match) {
      const options = values.map(entry => entry.id ?? entry).join(', ');
      throw new Error(`Capability ${capabilityId} expects one of: ${options}`);
    }
  } else if (typeof values === 'object') {
    if (!Object.prototype.hasOwnProperty.call(values, normalized)) {
      const options = Object.keys(values).join(', ');
      throw new Error(`Capability ${capabilityId} expects one of: ${options}`);
    }
  }

  return normalized;
}

function validateNumberRange(value, capability, capabilityId) {
  const min = typeof capability.min === 'number' ? capability.min : null;
  const max = typeof capability.max === 'number' ? capability.max : null;

  if (min !== null && value < min) {
    throw new Error(`Capability ${capabilityId} expects a value >= ${min}.`);
  }
  if (max !== null && value > max) {
    throw new Error(`Capability ${capabilityId} expects a value <= ${max}.`);
  }

  return value;
}

function coerceCapabilityValue(capabilityId, capability, rawValue) {
  const parsed = parseRawValue(rawValue);
  const type = capability.type || typeof parsed;

  if (type === 'boolean') {
    return ensureBoolean(parsed, capabilityId);
  }

  if (type === 'number') {
    const numberValue = ensureNumber(parsed, capabilityId);
    return validateNumberRange(numberValue, capability, capabilityId);
  }

  if (type === 'enum') {
    return ensureEnum(parsed, capability, capabilityId);
  }

  if (type === 'string') {
    return String(parsed);
  }

  if (type === 'color') {
    if (typeof parsed === 'object') return parsed;
    throw new Error(`Capability ${capabilityId} expects a color object. Use JSON like {"r":255,"g":0,"b":0}.`);
  }

  return parsed;
}

function ensureCapabilitySetable(device, capabilityId) {
  const capability = device.capabilitiesObj?.[capabilityId];
  if (!capability) {
    throw new Error(`Capability ${capabilityId} not found on device ${device.name || device.id}.`);
  }

  if (!capability.setable) {
    throw new Error(`Capability ${capabilityId} is read-only on device ${device.name || device.id}.`);
  }

  return capability;
}

module.exports = {
  parseRawValue,
  coerceCapabilityValue,
  ensureCapabilitySetable,
};
